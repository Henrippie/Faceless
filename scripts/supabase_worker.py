#!/usr/bin/env python3
"""Worker da Central de Canais Dark: consome a fila de vídeos no Supabase e
usa o motor MoneyPrinterTurbo (mesma stack do cli.py) para gerar as versões
vertical (9:16) e horizontal (16:9) de cada vídeo, subindo os arquivos
prontos para o Storage do Supabase e atualizando o status da linha.

Roda em loop, um vídeo por vez (a geração de imagem por IA usa uma única
configuração global por processo, então processar em série evita um job
"vazar" o estilo visual de outro canal para o job seguinte).

Uso:
    export SUPABASE_URL="https://xxxx.supabase.co"
    export SUPABASE_SERVICE_ROLE_KEY="..."   # chave service_role, NUNCA a anon
    uv run python scripts/supabase_worker.py
    uv run python scripts/supabase_worker.py --once   # processa 1 fila e sai
    uv run python scripts/supabase_worker.py --interval 20

A chave service_role fica em Project Settings > API no painel do Supabase.
Ela ignora RLS de propósito — é o que permite o worker gerar vídeos para
qualquer canal do dono da conta, e ler as chaves de LLM/imagem/ElevenLabs
que o dono salvou em /settings no painel (cifradas via Supabase Vault,
lidas aqui através da RPC get_credentials_for_owner, exclusiva do
service_role). Nunca coloque a service_role key no frontend nem a exponha
publicamente.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from loguru import logger

STORAGE_BUCKET = "videos"
# 1 parágrafo casa melhor com Shorts/Reels de ~60s; combine com uma meta de
# palavras no video_script_prompt do canal para controlar a duração de perto.
DEFAULT_PARAGRAPH_NUMBER = 1
DEFAULT_ASPECTS = ("vertical", "horizontal")
ASPECT_RATIOS = {"vertical": "9:16", "horizontal": "16:9"}

# Faixas de progresso (0-100) que o pipeline do MPT já reporta internamente
# via app.services.state, mapeadas pra um rótulo em português pro stepper.
_STAGE_LABELS_BY_PERCENT = (
    (10, "Gerando roteiro"),
    (20, "Selecionando palavras-chave"),
    (30, "Gerando narração"),
    (40, "Gerando legenda"),
    (90, "Baixando/gerando imagens das cenas"),
    (99, "Compilando vídeo"),
    (100, "Finalizando"),
)


def _stage_label_for_percent(percent: float) -> str:
    for threshold, label in _STAGE_LABELS_BY_PERCENT:
        if percent <= threshold:
            return label
    return "Processando"


def _run_with_progress(supabase, video_id: str, task_id: str, aspect_label: str | None, fn):
    """Roda ``fn()`` (uma chamada bloqueante a ``tm.start``) numa thread e,
    em paralelo, faz polling de ``app.services.state`` — que o pipeline do
    MPT já atualiza internamente a cada etapa — pra gravar um progresso
    granular em ``videos.progress_stage``/``progress_detail``. Isso troca o
    spinner cego por um checklist ao vivo sem precisar reescrever o
    pipeline em etapas separadas."""
    from app.services import state as sm

    stop_event = threading.Event()
    result_holder: dict[str, Any] = {}

    def poll():
        last_percent = -1
        while not stop_event.is_set():
            task_state = sm.state.get_task(task_id) or {}
            percent = task_state.get("progress", 0) or 0
            if percent != last_percent:
                last_percent = percent
                try:
                    supabase.table("videos").update(
                        {
                            "progress_stage": _stage_label_for_percent(percent),
                            "progress_detail": {"percent": percent, "aspect": aspect_label},
                        }
                    ).eq("id", video_id).execute()
                except Exception:  # noqa: BLE001 - progresso é best-effort
                    logger.exception(f"falha ao gravar progresso do vídeo {video_id}")
            stop_event.wait(2.0)

    thread = threading.Thread(target=poll, daemon=True)
    thread.start()
    try:
        result_holder["value"] = fn()
    finally:
        stop_event.set()
        thread.join(timeout=5)
    return result_holder["value"]


def _get_supabase_client():
    from supabase import create_client

    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise SystemExit(
            "defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente antes de rodar o worker."
        )
    return create_client(url, key)


def _fetch_next_queued_video(supabase) -> dict[str, Any] | None:
    response = (
        supabase.table("videos")
        .select("*")
        .eq("status", "queued")
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return rows[0] if rows else None


def _fetch_channel(supabase, channel_id: str) -> dict[str, Any]:
    response = (
        supabase.table("channels").select("*").eq("id", channel_id).single().execute()
    )
    if not response.data:
        raise RuntimeError(f"canal {channel_id} não encontrado")
    return response.data


def _fetch_credentials(supabase, owner_id: str) -> dict[str, Any]:
    """Busca as chaves de API salvas pelo dono em /settings, já
    descriptografadas do Vault. Só funciona com a service_role key (a RPC
    tem EXECUTE revogado de anon/authenticated de propósito)."""
    response = supabase.rpc(
        "get_credentials_for_owner", {"p_owner_id": owner_id}
    ).execute()
    return response.data or {}


def _apply_llm_credentials(creds: dict[str, Any]) -> None:
    from app.config import config

    provider = (creds.get("llm_provider") or "").strip()
    api_key = (creds.get("llm_api_key") or "").strip()
    if not provider or not api_key:
        raise RuntimeError(
            "chave de LLM não configurada. Adicione uma em /settings antes de gerar vídeos."
        )

    model = (creds.get("llm_model") or "").strip()
    base_url = (creds.get("llm_base_url") or "").strip()
    config.app["llm_provider"] = provider
    config.app[f"{provider}_api_key"] = api_key
    if model:
        config.app[f"{provider}_model_name"] = model
    if base_url:
        config.app[f"{provider}_base_url"] = base_url


def _apply_image_credentials(creds: dict[str, Any]) -> None:
    from app.config import config

    base_url = (creds.get("image_base_url") or "").strip()
    model = (creds.get("image_model") or "").strip()
    api_key = (creds.get("image_api_key") or "").strip()
    if not base_url or not model:
        raise RuntimeError(
            "geração de imagem não configurada. Adicione base URL e modelo em "
            "/settings antes de gerar vídeos."
        )

    config.app["openai_image_base_url"] = base_url
    config.app["openai_image_model"] = model
    config.app["openai_image_api_keys"] = [api_key] if api_key else []


def _apply_elevenlabs_credentials(creds: dict[str, Any], voice_name: str) -> None:
    from app.config import config

    if not voice_name.startswith("elevenlabs:"):
        raise RuntimeError(
            "canal está com narrador ElevenLabs, mas a voz precisa começar com "
            "'elevenlabs:' seguido do ID da voz."
        )

    api_key = (creds.get("elevenlabs_api_key") or "").strip()
    if not api_key:
        raise RuntimeError(
            "chave da ElevenLabs não configurada. Adicione uma em /settings ou "
            "troque o narrador do canal para Edge TTS."
        )
    config.elevenlabs["api_key"] = api_key


def _generate_script(
    supabase, video_id: str, channel: dict[str, Any], subject: str, creds: dict[str, Any]
) -> str:
    from app.models.schema import VideoParams
    from app.services import task as tm
    from app.utils import utils

    _apply_llm_credentials(creds)

    params = VideoParams(
        video_subject=subject,
        video_language=channel.get("language") or "",
        paragraph_number=DEFAULT_PARAGRAPH_NUMBER,
        video_script_prompt=channel.get("video_script_prompt") or "",
        custom_system_prompt=channel.get("custom_system_prompt") or "",
        voice_name=channel.get("voice_name") or "",
    )
    task_id = utils.get_uuid()
    result = _run_with_progress(
        supabase,
        video_id,
        task_id,
        None,
        lambda: tm.start(task_id=task_id, params=params, stop_at="script"),
    )
    if not result or "script" not in result:
        raise RuntimeError(f"falha ao gerar roteiro (task_id={task_id}): {result}")
    return result["script"]


def _generate_video_for_aspect(
    supabase,
    video_id: str,
    channel: dict[str, Any],
    subject: str,
    script_text: str,
    aspect_label: str,
    creds: dict[str, Any],
) -> dict[str, Any]:
    from app.config import config
    from app.models.schema import VideoParams
    from app.services import task as tm
    from app.utils import utils

    _apply_image_credentials(creds)

    voice_name = channel.get("voice_name") or ""
    if channel.get("tts_provider") == "elevenlabs":
        _apply_elevenlabs_credentials(creds, voice_name)

    # openai_image_prompt_template é uma configuração global do app (não faz
    # parte de VideoParams), então trocamos ela por job para dar a cada canal
    # sua própria identidade visual. Seguro porque o worker roda 1 job por vez.
    image_prompt_template = (channel.get("image_prompt_template") or "").strip()
    if image_prompt_template:
        config.app["openai_image_prompt_template"] = image_prompt_template

    bgm_kwargs: dict[str, Any] = {}
    bgm_local_path: str | None = None
    bg_music_path = (channel.get("bg_music_path") or "").strip()
    if bg_music_path:
        # Trilha sonora padrão do canal, definida em /canais/<id> (aba
        # Configurações). Sem isso, mantém o comportamento padrão do MPT
        # (bgm_type="random" dos VideoParams) pra não mudar vídeos existentes.
        bgm_local_path = _download_storage_file(supabase, bg_music_path, ".audio")
        bgm_kwargs = {
            "bgm_type": "custom",
            "bgm_file": bgm_local_path,
            "bgm_volume": float(channel.get("bg_music_volume") or 0.12),
        }

    try:
        params = VideoParams(
            video_subject=subject,
            video_script=script_text,
            video_language=channel.get("language") or "",
            voice_name=voice_name,
            video_aspect=ASPECT_RATIOS[aspect_label],
            video_source="openai_image",
            **bgm_kwargs,
        )
        task_id = utils.get_uuid()
        result = _run_with_progress(
            supabase,
            video_id,
            task_id,
            aspect_label,
            lambda: tm.start(task_id=task_id, params=params, stop_at="video"),
        )
        if not result or not result.get("videos"):
            raise RuntimeError(
                f"falha ao gerar vídeo {aspect_label} (task_id={task_id}): {result}"
            )
        return result
    finally:
        if bgm_local_path:
            try:
                os.remove(bgm_local_path)
            except OSError:
                pass


# Referências ASPRE, não fatura real: preços variam por provedor, modelo,
# plano e promoção. Servem só pra dar uma ordem de grandeza de custo por
# vídeo — a UI deixa claro que é aproximado ("~US$ X").
_EST_COST_PER_IMAGE_USD = 0.04
_EST_COST_PER_ELEVENLABS_CHAR_USD = 0.00015
_EST_COST_PER_LLM_1K_TOKENS_USD = 0.01


def _estimate_cost_usd(script_text: str, images_generated: int, tts_provider: str) -> float:
    script_chars = len(script_text or "")
    est_tokens = script_chars / 4
    llm_cost = (est_tokens / 1000) * _EST_COST_PER_LLM_1K_TOKENS_USD
    image_cost = images_generated * _EST_COST_PER_IMAGE_USD
    tts_cost = (
        script_chars * _EST_COST_PER_ELEVENLABS_CHAR_USD
        if tts_provider == "elevenlabs"
        else 0.0
    )
    return round(llm_cost + image_cost + tts_cost, 4)


def _upload_result(supabase, owner_id: str, video_id: str, aspect_label: str, local_path: str) -> str:
    storage_path = f"{owner_id}/{video_id}/{aspect_label}.mp4"
    with open(local_path, "rb") as fh:
        supabase.storage.from_(STORAGE_BUCKET).upload(
            storage_path,
            fh.read(),
            {"content-type": "video/mp4", "upsert": "true"},
        )
    return storage_path


def _generate_thumbnail(local_video_path: str) -> str | None:
    """Extrai um frame do vídeo pronto pra usar de capa (grade da mesa e
    card do vídeo). Best-effort: se o ffmpeg falhar, o vídeo continua
    salvo normalmente, só sem thumbnail."""
    from app.utils import utils

    ffmpeg_bin = utils.get_ffmpeg_binary()
    fd, thumb_path = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)
    try:
        completed = subprocess.run(
            [
                ffmpeg_bin,
                "-y",
                "-i",
                local_video_path,
                "-ss",
                "00:00:01",
                "-vframes",
                "1",
                "-q:v",
                "3",
                thumb_path,
            ],
            capture_output=True,
            timeout=30,
        )
        if completed.returncode != 0 or os.path.getsize(thumb_path) == 0:
            logger.warning(
                f"falha ao gerar thumbnail: {completed.stderr.decode(errors='ignore')[:300]}"
            )
            os.remove(thumb_path)
            return None
        return thumb_path
    except Exception:  # noqa: BLE001 - thumbnail é best-effort, nunca deve falhar o vídeo
        logger.exception("falha ao gerar thumbnail do vídeo")
        if os.path.exists(thumb_path):
            os.remove(thumb_path)
        return None


def process_one(supabase, video: dict[str, Any]) -> None:
    video_id = video["id"]
    owner_id = video["owner_id"]
    subject = video["subject"]

    logger.info(f"processando vídeo {video_id}: {subject!r}")
    supabase.table("videos").update(
        {
            "status": "generating",
            "error": None,
            "progress_stage": None,
            "progress_detail": {},
        }
    ).eq("id", video_id).execute()

    try:
        channel = _fetch_channel(supabase, video["channel_id"])
        creds = _fetch_credentials(supabase, owner_id)
        formats = channel.get("formats") or list(DEFAULT_ASPECTS)
        had_script = bool(video.get("script"))
        script_text = video.get("script") or _generate_script(
            supabase, video_id, channel, subject, creds
        )

        if not had_script and video.get("mode") == "review_script":
            # Canal pediu revisão de roteiro antes de gastar crédito com
            # imagem/áudio: para aqui e espera a aprovação em /canais/<id>
            # (approveScript volta o status pra "queued" com o roteiro já
            # salvo, e o próximo process_one pula direto pra geração de mídia).
            supabase.table("videos").update(
                {"script": script_text, "status": "script_ready"}
            ).eq("id", video_id).execute()
            logger.info(f"vídeo {video_id} aguardando aprovação do roteiro")
            return

        update: dict[str, Any] = {"script": script_text}
        duration_seconds: float | None = None
        subtitle_storage_path: str | None = None
        thumbnail_storage_path: str | None = None
        images_generated = 0

        for aspect_label in DEFAULT_ASPECTS:
            if aspect_label not in formats:
                continue
            result = _generate_video_for_aspect(
                supabase, video_id, channel, subject, script_text, aspect_label, creds
            )
            local_path = result["videos"][0]
            storage_path = _upload_result(supabase, owner_id, video_id, aspect_label, local_path)
            update[f"{aspect_label}_path"] = storage_path
            duration_seconds = result.get("audio_duration") or duration_seconds
            images_generated += len(result.get("materials") or [])

            if thumbnail_storage_path is None:
                # Capa usada na galeria e na "mesa" (hero) — primeiro
                # frame do primeiro formato gerado, sem depender de qual
                # aspecto o canal ativou.
                thumb_local = _generate_thumbnail(local_path)
                if thumb_local:
                    thumbnail_storage_path = f"{owner_id}/{video_id}/thumbnail.jpg"
                    with open(thumb_local, "rb") as fh:
                        supabase.storage.from_(STORAGE_BUCKET).upload(
                            thumbnail_storage_path,
                            fh.read(),
                            {"content-type": "image/jpeg", "upsert": "true"},
                        )
                    try:
                        os.remove(thumb_local)
                    except OSError:
                        pass

            local_subtitle_path = result.get("subtitle_path")
            if subtitle_storage_path is None and local_subtitle_path and os.path.exists(
                local_subtitle_path
            ):
                subtitle_storage_path = f"{owner_id}/{video_id}/subtitle.srt"
                with open(local_subtitle_path, "rb") as fh:
                    supabase.storage.from_(STORAGE_BUCKET).upload(
                        subtitle_storage_path,
                        fh.read(),
                        {"content-type": "text/plain", "upsert": "true"},
                    )

        if duration_seconds is not None:
            update["duration_seconds"] = duration_seconds
        if subtitle_storage_path is not None:
            update["subtitle_path"] = subtitle_storage_path
        if thumbnail_storage_path is not None:
            update["thumbnail_path"] = thumbnail_storage_path
        if images_generated:
            update["est_cost_usd"] = _estimate_cost_usd(
                script_text, images_generated, channel.get("tts_provider") or "edge"
            )
        update["status"] = "ready"
        update["progress_stage"] = None
        update["progress_detail"] = {}
        supabase.table("videos").update(update).eq("id", video_id).execute()
        logger.success(f"vídeo {video_id} pronto")
    except Exception as exc:  # noqa: BLE001 - queremos registrar qualquer falha e seguir para o próximo job
        logger.exception(f"vídeo {video_id} falhou: {exc}")
        supabase.table("videos").update(
            {"status": "failed", "error": str(exc)}
        ).eq("id", video_id).execute()


def _fetch_next_approved_video(supabase) -> dict[str, Any] | None:
    """Vídeo aprovado no painel (approve_video RPC) com plataformas
    configuradas no canal — publish_state só vira 'queued' quando há pelo
    menos uma plataforma marcada, então autopublish nunca dispara sem o
    dono ter aprovado explicitamente. scheduled_at (opcional, definido no
    popup de aprovação) segura a publicação até a data escolhida."""
    now = datetime.now(timezone.utc).isoformat()
    response = (
        supabase.table("videos")
        .select("*")
        .eq("publish_state", "queued")
        .or_(f"scheduled_at.is.null,scheduled_at.lte.{now}")
        .order("approved_at", desc=False)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return rows[0] if rows else None


def _apply_upload_post_credentials(creds: dict[str, Any]) -> None:
    from app.config import config

    username = (creds.get("upload_post_username") or "").strip()
    api_key = (creds.get("upload_post_api_key") or "").strip()
    if not username or not api_key:
        raise RuntimeError(
            "Upload-Post não configurado. Adicione usuário e chave em /settings "
            "antes de aprovar vídeos com publicação automática."
        )
    config.app["upload_post_enabled"] = True
    config.app["upload_post_username"] = username
    config.app["upload_post_api_key"] = api_key


def _download_storage_file(supabase, storage_path: str, suffix: str) -> str:
    data = supabase.storage.from_(STORAGE_BUCKET).download(storage_path)
    fd, local_path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as fh:
        fh.write(data)
    return local_path


def _publish_video(supabase, video: dict[str, Any]) -> None:
    from app.services.upload_post import upload_post_service

    video_id = video["id"]
    owner_id = video["owner_id"]
    storage_path = video.get("vertical_path") or video.get("horizontal_path")
    if not storage_path:
        supabase.table("videos").update(
            {"publish_state": "failed", "publish_error": "vídeo sem arquivo pronto para publicar."}
        ).eq("id", video_id).execute()
        return

    channel = _fetch_channel(supabase, video["channel_id"])
    platforms = channel.get("publish_platforms") or []
    if not platforms:
        supabase.table("videos").update({"publish_state": "idle"}).eq("id", video_id).execute()
        return

    logger.info(f"publicando vídeo {video_id} em {', '.join(platforms)}")
    supabase.table("videos").update(
        {"publish_state": "publishing", "publish_error": None}
    ).eq("id", video_id).execute()

    local_path: str | None = None
    try:
        creds = _fetch_credentials(supabase, owner_id)
        _apply_upload_post_credentials(creds)

        local_path = _download_storage_file(supabase, storage_path, ".mp4")

        youtube_extra = None
        if any(platform.startswith("youtube") for platform in platforms):
            youtube_extra = {
                "selfDeclaredMadeForKids": bool(channel.get("youtube_made_for_kids"))
            }

        result = upload_post_service.upload_video(
            local_path,
            title=video.get("subject") or "",
            platforms=platforms,
            youtube_extra=youtube_extra,
        )
        if not result.get("success"):
            raise RuntimeError(
                result.get("error") or result.get("message") or "falha ao publicar no Upload-Post"
            )

        publish_results = {platform: result for platform in platforms}
        supabase.table("videos").update(
            {"publish_state": "done", "publish_results": publish_results, "publish_error": None}
        ).eq("id", video_id).execute()
        logger.success(f"vídeo {video_id} publicado em {', '.join(platforms)}")
    except Exception as exc:  # noqa: BLE001 - registra a falha e segue para o próximo job
        logger.exception(f"falha ao publicar vídeo {video_id}: {exc}")
        supabase.table("videos").update(
            {"publish_state": "failed", "publish_error": str(exc)}
        ).eq("id", video_id).execute()
    finally:
        if local_path:
            try:
                os.remove(local_path)
            except OSError:
                pass


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--interval",
        type=float,
        default=15.0,
        help="segundos entre verificações da fila quando ela está vazia (padrão: 15)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="processa no máximo um vídeo da fila e encerra",
    )
    args = parser.parse_args(argv)

    supabase = _get_supabase_client()
    logger.info("worker da Central de Canais Dark iniciado")

    while True:
        video = _fetch_next_queued_video(supabase)
        if video is None:
            if args.once:
                logger.info("fila vazia, nada para processar")
                return 0
            time.sleep(args.interval)
            continue

        process_one(supabase, video)

        if args.once:
            return 0


if __name__ == "__main__":
    raise SystemExit(main())
