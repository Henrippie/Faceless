<div align="center">

# Canal Dark de Histórias Bíblicas

### Pipeline automatizado para gerar vídeos "faceless" de histórias da Bíblia

Este projeto é um fork do [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo)
(MIT License, © Harry), adaptado e pré-configurado para produzir vídeos curtos
(Shorts/Reels/TikTok) narrando histórias bíblicas em português, com estética
sombria/cinematográfica ("dark channel"), sem aparecer rosto algum.

[Documentação original em inglês](README-en.md) · [中文](README-zh.md) · [日本語](README-ja.md)

</div>

---

## O que este fork adiciona

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
