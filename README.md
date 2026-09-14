<div align="center">

# Central de Canais Dark

### Motor + painel para tocar vários canais "faceless" ao mesmo tempo — o primeiro é de histórias bíblicas

Este projeto tem três partes: o **motor de geração de vídeo** (fork do
[MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo), MIT
License, © Harry), um **painel web** (`frontend/`) onde você cadastra até
100 canais e acompanha os vídeos gerados por todos eles em um só lugar, e um
**worker** (`scripts/supabase_worker.py`) que liga as duas pontas: consome a
fila de vídeos pedidos no painel e roda o motor para produzi-los.

O primeiro canal configurado é de histórias bíblicas em português, com
estética sombria/cinematográfica ("dark channel"), sem aparecer rosto algum
— mas nada no motor é específico da Bíblia; qualquer nicho vira só mais um
canal no painel.

[Documentação original em inglês](README-en.md) · [中文](README-zh.md) · [日本語](README-ja.md)

</div>

---

## Arquitetura

```
        painel (frontend/, Next.js na Vercel)
        cadastra canais, pede vídeos, mostra a "mesa" de resultados
                          │
                          ▼
        Supabase (Postgres + Storage)
        tabelas channels/videos = fila e catálogo de vídeos
                          │
                          ▼
        worker (scripts/supabase_worker.py)
        consome a fila, roda o motor abaixo, sobe o .mp4 pronto
                          │
                          ▼
        motor MoneyPrinterTurbo (este repositório, raiz)
        roteiro (LLM) → narração (TTS) → imagens de IA → montagem (ffmpeg)
```

- **Painel**: veja [`frontend/README.md`](frontend/README.md) para rodar e
  fazer deploy.
- **Worker**: veja a seção [Worker da fila (Supabase)](#worker-da-fila-supabase)
  abaixo.
- **Motor**: o resto deste README — pode ser usado sozinho, sem painel nem
  Supabase, via WebUI/CLI/scripts, exatamente como um fork "de canal único".

## O que este fork adiciona ao MoneyPrinterTurbo

O MoneyPrinterTurbo original é uma ferramenta genérica: você dá um tema, ele
gera roteiro (LLM), narração (TTS), busca/gera imagens ou vídeos, legenda e
monta o vídeo final. Este repositório mantém o motor intacto e adiciona:

- **`config.canal-biblico.toml`** — template de configuração já ajustado para
  o canal: roteiro em PT-BR com tom sério/documental, narrador grave
  (`pt-BR-AntonioNeural`), geração de imagens de IA com prompt fixo em estilo
  "pintura religiosa dramática, chiaroscuro, tons escuros e dourados" e
  legendas com fonte que suporta acentuação.
- **`resource/temas_historias_biblicas.md`** — banco de ~60 ideias de vídeo
  (Antigo e Novo Testamento) para nunca faltar pauta.
- Este README, com o passo a passo específico do canal.

Tudo o mais (WebUI em Streamlit, API FastAPI, CLI, suporte a dezenas de
provedores de LLM/TTS/imagem/vídeo, publicação automática no YouTube/TikTok/
Instagram) é o projeto original — veja [README-en.md](README-en.md) para a
referência técnica completa.

## Como funciona a esteira de produção

```
tema da história  →  roteiro (LLM)  →  narração (TTS)  →  imagens de IA por cena
                                                              ↓
                                    legenda + trilha sonora + montagem (ffmpeg)
                                                              ↓
                                         vídeo pronto (9:16) → publicar
```

1. Você informa o **tema** (ex.: "Davi e Golias") e, opcionalmente, o número
   de parágrafos.
2. O LLM escreve o roteiro em português, seguindo o `video_script_prompt` e o
   `custom_system_prompt` já definidos no template (tom sombrio, fiel ao
   texto bíblico, sem sensacionalismo vazio).
3. O Edge TTS narra o roteiro com a voz `pt-BR-AntonioNeural`.
4. Para cada cena/palavra-chave do roteiro, o `openai_image` gera uma imagem
   de IA no estilo definido (pintura religiosa dramática).
5. O ffmpeg monta tudo: imagens com efeito de zoom, legendas, música de
   fundo baixa, no formato vertical 9:16.

## Configuração inicial

### 1. Instalar dependências

```bash
# Recomendado: uv (gerenciador de pacotes Python)
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync --frozen
```

### 2. Criar o config.toml a partir do template do canal

```bash
cp config.canal-biblico.toml config.toml
```

Abra `config.toml` e preencha, no mínimo:

| Chave | Para quê serve | Onde conseguir |
|---|---|---|
| `llm_provider` + `<provedor>_api_key` | escreve o roteiro | ex. [OpenAI](https://platform.openai.com/api-keys), [Gemini](https://aistudio.google.com/app/apikey), [Kimi/Moonshot](https://platform.kimi.com) |
| `openai_image_base_url`, `openai_image_api_keys`, `openai_image_model` | gera as imagens de IA de cada cena | endpoint compatível com `/images/generations` (OpenAI, ou um gateway local tipo ComfyUI/Stable Diffusion) |

A narração (Edge TTS) e as legendas já funcionam sem nenhuma chave — são
gratuitas.

> Se preferir vídeos de banco de imagens (Pexels/Pixabay) em vez de imagens
> de IA, basta trocar `video_source = "openai_image"` por `"pexels"` e
> preencher `pexels_api_keys` — mas para o estilo "dark" recomendamos manter
> as imagens de IA, que dão uma identidade visual muito mais consistente.

### 3. Rodar a interface (WebUI)

```bash
sh webui.sh
```

Abre em `http://127.0.0.1:8501`. Selecione um tema do banco de ideias
(`resource/temas_historias_biblicas.md`), gere o roteiro, revise, gere o
vídeo.

### 4. (Opcional) Rodar via API ou linha de comando

```bash
python main.py        # sobe a API FastAPI em :8080, docs em /docs
python cli.py --help  # geração via linha de comando, útil para automatizar
```

### 5. Gerar as duas versões do vídeo (vertical + horizontal) de uma vez

A WebUI gera um vídeo por vez, em um aspecto por vez. Para publicar o mesmo
vídeo em Reels/TikTok/Shorts/Kwai (vertical) **e** no YouTube tradicional
(horizontal) a partir da mesma narração, use o script
`scripts/gerar_dois_formatos.py`:

```bash
uv run python scripts/gerar_dois_formatos.py --video-subject "Davi e Golias"
```

Ele gera o roteiro **uma única vez** (ou usa o texto de `--video-script`, se
você já tiver um pronto) e reaproveita a mesma narração nas duas montagens,
para garantir que o áudio seja idêntico nos dois formatos — só a
imagem/composição muda por aspecto:

- `saida/<slug>/vertical.mp4` — 9:16, para Reels, TikTok, YouTube Shorts e Kwai
- `saida/<slug>/horizontal.mp4` — 16:9, para YouTube

Aceita as mesmas opções de `cli.py` (voz, fonte de imagens, música, legenda
etc.) exceto `--video-aspect`, `--stop-at`, `--batch-file` e `--task-id`, que
o script controla para gerar as duas versões. Use `--slug` para nomear a
pasta de saída manualmente. Veja `uv run python scripts/gerar_dois_formatos.py --help`
para todas as opções.

## Worker da fila (Supabase)

Se você está usando o [painel](frontend/README.md) para cadastrar canais e
pedir vídeos, é o worker que efetivamente os gera. Ele fica em loop, olhando
a tabela `videos` no Supabase por linhas com `status = "queued"`.

```bash
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."   # Project Settings → API no painel do Supabase
uv run python scripts/supabase_worker.py
```

Para cada vídeo pedido: gera o roteiro uma vez (usando o `video_script_prompt`
e `custom_system_prompt` salvos no canal), depois monta a versão vertical
e/ou horizontal conforme os `formats` do canal, sobe os `.mp4` prontos para o
bucket `videos` do Storage e atualiza o status da linha para `ready` (ou
`failed`, com o erro, se algo quebrar). Roda um vídeo por vez — a chave
service_role é secreta, nunca a exponha no painel nem a comite.

`--once` processa um único vídeo da fila e encerra (bom para rodar via cron);
`--interval SEGUNDOS` ajusta o intervalo entre verificações da fila vazia
(padrão 15s).

## Publicação automática

O projeto já traz integração com o [Upload-Post](https://upload-post.com/)
para publicar direto no YouTube, TikTok e Instagram
(`upload_post_*` no `config.toml`). Recomendo deixar
`upload_post_auto_upload = false` no início, revisar alguns vídeos
manualmente, e só depois automatizar a publicação.

## Recomendações para um canal "dark" de histórias bíblicas

- **Consistência visual**: não troque o prompt de imagem entre vídeos — é o
  que dá identidade ao canal.
- **Fidelidade ao texto**: o `custom_system_prompt` já pede para o roteiro
  não inventar fatos fora da narrativa bíblica; revise os roteiros antes de
  publicar, principalmente para checar referências (livro/capítulo/versículo).
- **Direitos autorais de trilha sonora**: use `bgm_type = "random"` com as
  músicas royalty-free incluídas em `resource/songs`, ou configure sua
  própria trilha em `custom_bgm_file`.
- **Sem rosto, sem voz própria**: o pipeline inteiro (roteiro → narração IA →
  imagens IA → montagem) já é 100% "faceless" por padrão.

## Créditos

Motor de geração de vídeo: [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)
por [harry0703](https://github.com/harry0703), licenciado sob MIT. Veja
[LICENSE](LICENSE).
