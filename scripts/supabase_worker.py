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
import sys
import time
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


def _generate_script(channel: dict[str, Any], subject: str, creds: dict[str, Any]) -> str:
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
    result = tm.start(task_id=task_id, params=params, stop_at="script")
    if not result or "script" not in result:
        raise RuntimeError(f"falha ao gerar roteiro (task_id={task_id}): {result}")
    return result["script"]


def _generate_video_for_aspect(
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

    params = VideoParams(
        video_subject=subject,
        video_script=script_text,
        video_language=channel.get("language") or "",
        voice_name=voice_name,
        video_aspect=ASPECT_RATIOS[aspect_label],
        video_source="openai_image",
    )
    task_id = utils.get_uuid()
    result = tm.start(task_id=task_id, params=params, stop_at="video")
    if not result or not result.get("videos"):
        raise RuntimeError(
            f"falha ao gerar vídeo {aspect_label} (task_id={task_id}): {result}"
        )
    return result


def _upload_result(supabase, owner_id: str, video_id: str, aspect_label: str, local_path: str) -> str:
    storage_path = f"{owner_id}/{video_id}/{aspect_label}.mp4"
    with open(local_path, "rb") as fh:
        supabase.storage.from_(STORAGE_BUCKET).upload(
            storage_path,
            fh.read(),
            {"content-type": "video/mp4", "upsert": "true"},
        )
    return storage_path


def process_one(supabase, video: dict[str, Any]) -> None:
    video_id = video["id"]
    owner_id = video["owner_id"]
    subject = video["subject"]

    logger.info(f"processando vídeo {video_id}: {subject!r}")
    supabase.table("videos").update({"status": "generating", "error": None}).eq(
        "id", video_id
    ).execute()

    try:
        channel = _fetch_channel(supabase, video["channel_id"])
        creds = _fetch_credentials(supabase, owner_id)
        formats = channel.get("formats") or list(DEFAULT_ASPECTS)
        script_text = video.get("script") or _generate_script(channel, subject, creds)

        update: dict[str, Any] = {"script": script_text}
        duration_seconds: float | None = None

        for aspect_label in DEFAULT_ASPECTS:
            if aspect_label not in formats:
                continue
            result = _generate_video_for_aspect(
                channel, subject, script_text, aspect_label, creds
            )
            local_path = result["videos"][0]
            storage_path = _upload_result(supabase, owner_id, video_id, aspect_label, local_path)
            update[f"{aspect_label}_path"] = storage_path
            duration_seconds = result.get("audio_duration") or duration_seconds

        if duration_seconds is not None:
            update["duration_seconds"] = duration_seconds
        update["status"] = "ready"
        supabase.table("videos").update(update).eq("id", video_id).execute()
        logger.success(f"vídeo {video_id} pronto")
    except Exception as exc:  # noqa: BLE001 - queremos registrar qualquer falha e seguir para o próximo job
        logger.exception(f"vídeo {video_id} falhou: {exc}")
        supabase.table("videos").update(
            {"status": "failed", "error": str(exc)}
        ).eq("id", video_id).execute()


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
