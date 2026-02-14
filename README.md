# Kobayashi: Generative Crisis Simulator
Youtube Link: https://www.youtube.com/watch?v=jtCwqP1CO3Y
Kobayashi is a real-time crisis simulator for precision under pressure and controlled chaos.
Choose your role, step into the war room, and face a live meltdown: public feeds spike, stakeholders call, internal teams flood in, and the SLA clock starts.
You make decisive moves, Kobayashi scores every choice in real time, then delivers an After-Action Report plus ready-to-send comms: public statement, stakeholder email, support script, and internal memo.

## What Works Now

- Landing page at `/`
- Full simulator at `/simulator`
- After-action report view at `/aar?runId=...`
- Runtime-validated APIs:
  - `POST /api/episode/generate`
  - `POST /api/episode/evaluate`
  - `POST /api/episode/after_action`
  - `POST /api/tts`
- Deterministic mock fallback mode for demos
- Optional live mode via Anthropic + ElevenLabs when keys are set

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Zod runtime validation
- Native `fetch` provider calls (Anthropic and ElevenLabs)

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```bash
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-haiku-latest
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=voice_id_placeholder
```

## Live vs Mock Mode

- **Live mode** is used automatically when provider keys are configured.
- **Mock mode** is used automatically when keys are missing, provider calls fail, or provider output fails schema validation.
- Responses include `mode: "mock" | "live"` for episode and evaluation payloads.

## Simulator Loop

1. Start run (`/api/episode/generate`).
2. Timer starts (8 minutes).
3. Timed beats append public feed + internal chat events.
4. Reporter call triggers transcript + TTS audio flow.
5. Player submits actions (`/api/episode/evaluate`).
6. State and readiness update each action.
7. On timeout (or dev **End Now**), AAR is generated (`/api/episode/after_action`).
8. AAR is stored in localStorage and shown on `/aar?runId=...`.

## API Smoke Tests

Generate:
```bash
curl -sS -X POST http://localhost:3000/api/episode/generate \
  -H 'content-type: application/json' \
  -d '{"pack":"pr_meltdown","role":"Head of Comms","org":"SkyWave Air"}'
```

Evaluate:
```bash
curl -sS -X POST http://localhost:3000/api/episode/evaluate \
  -H 'content-type: application/json' \
  -d '{"runId":"run_demo","episodeId":"ep_demo","runState":{"publicSentiment":46,"trustScore":51,"legalRisk":"medium","newsVelocity":"rising","timeRemainingSec":420,"readinessScore":38},"action":"We hear customer frustration, legal is reviewing facts, and support hotline opens now.","context":{"note":"lastBeatId:beat_001"}}'
```

After action:
```bash
curl -sS -X POST http://localhost:3000/api/episode/after_action \
  -H 'content-type: application/json' \
  -d '{"runId":"run_demo","runLog":[{"ts":"2026-02-14T18:00:00.000Z","type":"action","message":"Submitted holding statement"}],"finalState":{"publicSentiment":53,"trustScore":57,"legalRisk":"medium","newsVelocity":"steady","timeRemainingSec":0,"readinessScore":49}}'
```

TTS:
```bash
curl -sS -X POST http://localhost:3000/api/tts \
  -H 'content-type: application/json' \
  -d '{"text":"Reporter requesting comment on the incident.","persona":"Riley Trent"}' \
  --output /tmp/kobayashi_call.mp3
```

## Demo Script (Judges)

1. Open `/` and click **Start PR Meltdown**.
2. Wait for first feed/internal beats to populate.
3. Trigger reporter call, show ringing pre-roll and call playback.
4. Submit 1-2 actions and narrate readiness + score deltas.
5. Use **End Now (Dev)** or let timer expire.
6. Show `/aar` with narrative + artifacts and copy buttons.
