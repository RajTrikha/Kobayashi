# Kobayashi: Generative Crisis Simulator (Baseline Milestone)

This baseline milestone includes:
- Next.js (App Router) scaffold with TypeScript + Tailwind
- Shared Zod schemas for all simulator API contracts
- Stubbed mock API routes for episode generation, action evaluation, after-action reporting, and TTS

This milestone intentionally does **not** include simulator UI implementation, beat scheduling, persistence, tests, or provider abstractions yet.

## Requirements
- Node.js 20+
- npm 10+

## Setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

Server starts at [http://localhost:3000](http://localhost:3000).

## Environment Variables
Use only Anthropic/ElevenLabs keys:

```bash
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-haiku-latest
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=voice_id_placeholder
```

## API Endpoints (Mock Stubs)
- `POST /api/episode/generate`
- `POST /api/episode/evaluate`
- `POST /api/episode/after_action`
- `POST /api/tts`

All JSON endpoints enforce runtime validation using Zod and return `400` on invalid payloads.
`/api/tts` returns deterministic mock `audio/mpeg` bytes.

## Quick Smoke Test
```bash
curl -s http://localhost:3000/api/episode/generate \
  -H 'content-type: application/json' \
  -d '{"pack":"pr_meltdown","role":"Head of Comms","org":"SkyWave Air"}' | jq
```
