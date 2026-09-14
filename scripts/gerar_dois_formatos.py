#!/usr/bin/env python3
"""Gera duas versões do mesmo vídeo a partir de um único roteiro:

  - vertical (9:16) -> Reels, TikTok, YouTube Shorts, Kwai
  - horizontal (16:9) -> YouTube

O roteiro é gerado (ou lido de --video-script) apenas UMA vez e reaproveitado
nas duas chamadas, para garantir que a narração seja idêntica nos dois
formatos; apenas a montagem de imagem/vídeo muda por aspecto.

Uso:
    uv run python scripts/gerar_dois_formatos.py --video-subject "Davi e Golias"
    uv run python scripts/gerar_dois_formatos.py --video-script "roteiro pronto..." --slug davi-golias

Aceita as mesmas opções de cli.py (voz, fonte de imagens, música, legenda,
etc. — veja `uv run python cli.py --help`), EXCETO --video-aspect, --stop-at,
--batch-file e --task-id, que este script controla para gerar as duas
versões. Use --slug para escolher o nome da pasta de saída; por padrão é
derivado do tema do vídeo.

Os arquivos finais são copiados para saida/<slug>/vertical.mp4 e
saida/<slug>/horizontal.mp4 (além de ficarem em storage/tasks/<task_id>/,
como qualquer execução normal do cli.py).
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path
from typing import Sequence

# Permite rodar `uv run python scripts/gerar_dois_formatos.py` a partir de
# qualquer diretório, importando cli.py da raiz do projeto.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cli as mpt_cli

_UNSUPPORTED_FLAGS = ("--video-aspect", "--stop-at", "--batch-file", "--task-id")

# label -> (VideoAspect, descrição amigável para os logs)
_ASPECTS = {
    "vertical": ("9:16", "vertical (Reels, TikTok, YouTube Shorts, Kwai)"),
    "horizontal": ("16:9", "horizontal (YouTube)"),
}


def _slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "video"


def _check_unsupported(argv: Sequence[str]) -> None:
    for flag in _UNSUPPORTED_FLAGS:
        if any(item == flag or item.startswith(flag + "=") for item in argv):
            raise SystemExit(
                f"{flag} não é aceito aqui: este script já controla aspecto, "
                "estágio, task-id e execução em lote para gerar as duas versões "
                "(vertical + horizontal) de uma vez."
            )


def _split_slug(argv: Sequence[str]) -> tuple[str | None, list[str]]:
    slug = None
    cleaned: list[str] = []
    skip_next = False
    for index, item in enumerate(argv):
        if skip_next:
            skip_next = False
            continue
        if item == "--slug":
            if index + 1 >= len(argv):
                raise SystemExit("--slug requer um valor")
            slug = argv[index + 1]
            skip_next = True
            continue
        if item.startswith("--slug="):
            slug = item.split("=", 1)[1]
            continue
        cleaned.append(item)
    return slug, cleaned


def _get_script_text(argv: Sequence[str]) -> tuple[str, str]:
    from app.services import task as tm
    from app.utils import utils

    # O aspecto não importa para o estágio "script"; usamos um valor válido
    # só porque VideoParams exige um.
    args = mpt_cli.parse_args([*argv, "--video-aspect", "9:16", "--stop-at", "script"])
    params = mpt_cli.build_video_params(args)
    if params.video_script.strip():
        return params.video_script, args.video_subject.strip()

    task_id = utils.get_uuid()
    result = tm.start(
        task_id=task_id, params=params, stop_at="script", allow_server_file_input=True
    )
    if not result or "script" not in result:
        raise RuntimeError(f"falha ao gerar o roteiro (task_id={task_id}): {result}")
    return result["script"], args.video_subject.strip()


def _generate_video(argv: Sequence[str], aspect: str, script_text: str):
    from app.services import task as tm
    from app.utils import utils

    args = mpt_cli.parse_args([*argv, "--video-aspect", aspect, "--stop-at", "video"])
    params = mpt_cli.build_video_params(args)
    # Reaproveita o roteiro já gerado; ambos os formatos narram o mesmo texto.
    params.video_script = script_text

    task_id = utils.get_uuid()
    result = tm.start(
        task_id=task_id, params=params, stop_at="video", allow_server_file_input=True
    )
    if not result or not result.get("videos"):
        raise RuntimeError(f"falha ao gerar o vídeo (task_id={task_id}): {result}")
    return task_id, result


def main(argv: Sequence[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)

    if "-h" in argv or "--help" in argv:
        print(__doc__.strip() + "\n")
        mpt_cli.parse_args(argv)  # imprime as opções completas herdadas de cli.py e sai
        return 0

    _check_unsupported(argv)
    slug, cleaned_argv = _split_slug(argv)

    print(
        "Gerando roteiro (uma única vez, reaproveitado nos dois formatos)...",
        file=sys.stderr,
    )
    script_text, subject = _get_script_text(cleaned_argv)
    slug = slug or _slugify(subject or "video")

    output_dir = Path("saida") / slug
    output_dir.mkdir(parents=True, exist_ok=True)

    summary: dict = {"slug": slug, "script": script_text, "outputs": {}}

    for label, (aspect, description) in _ASPECTS.items():
        print(f"Gerando versão {description}...", file=sys.stderr)
        task_id, result = _generate_video(cleaned_argv, aspect, script_text)
        copied = []
        for index, video_path in enumerate(result.get("videos") or []):
            src = Path(video_path)
            suffix = src.suffix or ".mp4"
            dest_name = f"{label}{'' if index == 0 else f'-{index + 1}'}{suffix}"
            dest = output_dir / dest_name
            shutil.copy2(src, dest)
            copied.append(str(dest))
        summary["outputs"][label] = {
            "task_id": task_id,
            "aspect": aspect,
            "files": copied,
        }

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
