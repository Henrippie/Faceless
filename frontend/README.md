# Central de Canais Dark — Painel

Painel web (Next.js + TypeScript + Tailwind + shadcn/ui) para gerenciar até
100 canais "dark" (faceless) e ver os vídeos gerados por eles em um único
lugar — a "mesa" com todos os vídeos, filtráveis por canal e status, com
download das versões vertical e horizontal e controle manual de onde já
foram publicados.

Este painel **não gera vídeo sozinho**. Ele lê e escreve no banco (Supabase);
quem efetivamente roda o motor MoneyPrinterTurbo e produz os `.mp4` é o
worker em `../scripts/supabase_worker.py`, que fica de olho na fila e sobe
os arquivos prontos pro Storage. Veja a raiz do repositório para o motor de
geração.

## Stack

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS v4
- shadcn/ui sobre Base UI (`@base-ui/react` — não é Radix; triggers usam a
  prop `render`, não `asChild`)
- Supabase: Postgres (tabelas `channels` e `videos`, RLS por dono), Auth
  (magic link) e Storage (bucket privado `videos`)

## Configuração

1. Copie `.env.example` para `.env.local` e preencha com a URL e a chave
   `anon`/`publishable` do seu projeto Supabase (Project Settings → API).
   Essas duas chaves são públicas por design — protegidas pelo RLS, não por
   sigilo.
2. `npm install`
3. `npm run dev` — abre em `http://localhost:3000`

O schema (tabelas, RLS, bucket de storage, realtime) já foi aplicado direto
no projeto Supabase via migration; não é preciso rodar nada localmente para
isso. Se você recriar o projeto do zero, replique as migrations descritas no
histórico do PR ou peça para gerar o SQL novamente.

## Login

Autenticação é só por magic link (e-mail). Não há cadastro de senha. A
primeira pessoa a entrar com um e-mail vira dona dos canais criados por essa
conta (RLS usa `auth.uid()`).

## Estrutura

```
src/app/(dashboard)/page.tsx        Dashboard: hero + galeria de vídeos
src/app/(dashboard)/channels/page.tsx  Gestão de canais (até 100)
src/app/login, src/app/auth/callback   Autenticação (magic link)
src/app/actions.ts                  Server actions (criar canal, enfileirar vídeo, etc.)
src/components/ui/image-stream-hero.tsx  Hero animado (corredor 3D de imagens)
src/components/video-gallery.tsx    Galeria com filtros + realtime
src/components/*-dialog.tsx         Diálogos de criação (canal / vídeo)
src/lib/supabase/                   Clients Supabase (browser, server, proxy)
src/lib/database.types.ts           Tipos gerados do schema do Supabase
```

## Deploy

Pensado para rodar na Vercel, conectado ao repositório com **root directory
= `frontend`**. Configure as mesmas variáveis de `.env.local` nas
Environment Variables do projeto na Vercel.

O worker (`scripts/supabase_worker.py`) roda à parte — não é deployado na
Vercel (precisa de ffmpeg e de tempo de execução longo, incompatível com
funções serverless). Rode-o em qualquer máquina/servidor com Python, perto
de onde o MoneyPrinterTurbo já está configurado.
