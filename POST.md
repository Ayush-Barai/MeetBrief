# MeetBrief AI: meetings end, next steps don't get lost

> **Hacktoberfest Open-Source AI Challenge — Week 3**
>
> **Image note for DEV:** the nine images below are stored locally in
> `post-images/`. Upload them to DEV in the same order and replace each local
> path with the uploaded URL. The filenames are listed in the attachment table
> at the end of this post.

MeetBrief AI turns a meeting recording into a transcript, an evidence-linked
report, assigned action items, and an optional spoken recap.

The important part is not the summary. It is the trail behind the summary: every
decision and task points back to a timestamped transcript quote, speakers stay
anonymous until a human confirms a name, and missing evidence is removed instead
of smoothed over.

I built it with open-source AI and sponsor technology:

- **Gemma** for structured meeting analysis
- **Open-source Whisper** for self-hosted transcription
- **MongoDB Atlas** for meetings, transcripts, reports, and GridFS audio
- **ElevenLabs** for the optional audio recap
- **Render** for deployment

No proprietary speech API, no fabricated AI results, and no fake “successful”
provider calls.

---

## What I Built

MeetBrief is a Next.js 15 App Router PWA for people who leave meetings with more
questions than notes.

### The flow

1. **Upload or record** a meeting and confirm consent.
2. **Transcribe** with an OpenAI-compatible, self-hosted Whisper server.
3. **Analyze** the transcript with Gemma through an OpenAI-compatible
   `/chat/completions` endpoint.
4. **Review** a report with a purpose, outcomes, takeaways, discussion points,
   decisions, owners, deadlines, open questions, and a next-meeting agenda.
5. **Rename speakers** once you know who spoke. The anonymous labels are
   `Person 1`, `Person 2`, and so on.
6. **Generate a recap** with ElevenLabs from the edited report.
7. **Share read-only** with a revocable, hashed token, or export Markdown.

### What makes it different

**Evidence is a first-class object.** Gemma must cite transcript segment IDs.
The server validates the JSON with Zod and reconciles every claim against the
actual transcript. Unsupported decisions, owners, deadlines, and dates are
removed or rewritten, and the report shows warnings instead of pretending.

**Speakers are not guessed.** Diarization produces anonymous labels. Gemma may
suggest a real name only when that speaker explicitly introduces themselves in
the transcript. The suggestion is stored separately and never applied
automatically. A rename updates the transcript, report prose, speaker
contributions, matching action owners, exports, and the recap script — but never
rewrites evidence quotes.

**The demo is clearly fictional.** `/demo` is a complete interactive report with
no account and no AI request. The app labels it as demo data everywhere.

![MeetBrief landing page](post-images/01-landing.png)

---

## Demo

### Create a meeting without an attendee list

There is no manual participant entry. You add a title, choose a language, upload
a recording or record in the browser, and confirm consent. Speakers are detected
after transcription.

![Create a meeting report](post-images/02-new-meeting.png)

### The report workspace

The overview separates the executive summary from the evidence. The speaker
panel shows anonymous labels, segment counts, first appearance, and optional AI
suggestions that still require confirmation.

![Demo report overview](post-images/03-demo-overview.png)

![Speaker panel with Person 1–4 and AI suggestions](post-images/04-demo-speakers.png)

### Transcript with speaker labels

The transcript shows timestamps, anonymous speaker labels, and the transcription
provider/model. In this demo: `whisper (demo) · large-v3-turbo · diarized speaker
labels`.

![Demo transcript with speaker labels](post-images/05-demo-transcript.png)

### Decisions with evidence

Each decision has a status and a timestamped quote. “Confirmed” and “Tentative”
are visually distinct because a meeting record should preserve uncertainty.

![Demo decisions with evidence quotes](post-images/06-demo-decisions.png)

### Action items with real owners only

Owners and deadlines appear only when they were explicitly stated. Otherwise the
item is unassigned or the date is absent. Status can be updated as work moves.

![Demo action items with owners and evidence](post-images/07-demo-actions.png)

### Audio recap

The recap script is deterministic and built from the edited report. ElevenLabs
turns it into audio on demand. In the demo, the script is shown but no audio is
generated, so nothing is fabricated.

![Demo audio recap script](post-images/08-demo-recap.png)

### Setup status

The setup page tells you exactly what is configured and what is missing. This
screenshot was captured with integrations intentionally unconfigured — the app
reports that honestly instead of simulating a successful run.

![Integration setup page](post-images/09-setup.png)

---

## Code

**Repository:** <https://github.com/Ayush-Barai/MeetBrief>

The project is a Next.js 15 / React 19 / TypeScript app with:

```text
app/                 Routes, API handlers, demo, setup, share pages
components/          Meeting workspace, transcript, speakers, actions, recap
lib/ai/              Gemma adapter, prompt, validation, evidence reconciliation
lib/transcription/   Open-source Whisper adapter (OpenAI-compatible)
lib/meetings/        Processing pipeline and repository
lib/mongodb/         Atlas client, indexes, collections
lib/storage/         GridFS helpers
lib/elevenlabs/      Recap script and TTS
tests/               Vitest suites
render.yaml          Render blueprint
DEPLOYMENT.md        Atlas + Whisper + Gemma + Render walkthrough
```

### The transcription adapter

The app no longer depends on a proprietary speech API. It talks to any
OpenAI-compatible `/audio/transcriptions` endpoint. The recommended server is
ScribeCrate (`hwdsl2/whisper-server`), which wraps open-source `faster-whisper`
and supports local speaker diarization.

When the server returns a `speaker` field per segment, MeetBrief maps those
labels to stable `Person N` labels in first-seen order:

```ts
const speakerIndex = new Map<string, number>();
let sawSpeakerField = false;

const segments = rawSegments.map((segment) => {
  const token = speakerToken(segment);
  let speakerNumber = 1;

  if (token) {
    sawSpeakerField = true;
    if (!speakerIndex.has(token)) {
      speakerIndex.set(token, speakerIndex.size + 1);
    }
    speakerNumber = speakerIndex.get(token) ?? 1;
  }

  return {
    speakerId: `speaker-${speakerNumber}`,
    speakerLabel: `Person ${speakerNumber}`,
    // ...
  };
});

return {
  segments,
  provider: "whisper",
  model: config.transcriptionModel,
  diarized: sawSpeakerField && speakerIndex.size > 1,
};
```

If the server does not diarize, every segment is `Person 1` and the transcript
metadata says `diarized: false`. The app never invents speakers.

---

## How I Built It

### 1. Open-source transcription

```bash
docker run -d --name whisper \
  -p 9000:9000 \
  -e WHISPER_MODEL=large-v3-turbo \
  -e WHISPER_DIARIZATION=true \
  -v whisper-data:/var/lib/whisper \
  hwdsl2/whisper-server
```

```dotenv
TRANSCRIPTION_API_URL=http://localhost:9000/v1
TRANSCRIPTION_API_KEY=
TRANSCRIPTION_MODEL=whisper-1
TRANSCRIPTION_TIMEOUT_MS=600000
```

The API key is optional for a local server. Set it when the server requires
Bearer auth.

### 2. Gemma for structured analysis

Gemma is served through an OpenAI-compatible endpoint:

```dotenv
GEMMA_API_URL=http://localhost:11434/v1
GEMMA_MODEL=gemma3:27b
GEMMA_TIMEOUT_MS=180000
```

The prompt asks for JSON with evidence segment IDs. The response is validated
with Zod, then reconciled against the transcript before anything is saved. The
model's owners, deadlines, and dates are never trusted blindly.

### 3. MongoDB Atlas for the record

Atlas stores meeting metadata, ordered transcript segments, reports, action
items, and share-token hashes. Recordings and recap MP3s live in the GridFS
bucket `meeting_files`.

The ownership model is a signed, HTTP-only browser cookie for the MVP. Every
meeting read and write is scoped by `userId` on the server. Share links use
256-bit tokens; only the SHA-256 hash is stored, and links can be revoked.

### 4. ElevenLabs for the recap

The recap script is deterministic and built from the edited report. ElevenLabs
generates the audio on demand, and the MP3 is stored in GridFS. If TTS fails, the
script is still saved so it can be reviewed or retried.

### 5. Render for deployment

The repository includes `render.yaml`:

- Build: `npm ci && npm run build`
- Start: `npm run start`
- Health check: `/api/health`
- Node 22

`/api/health` returns `200 ok` only when MongoDB is configured and reachable. It
returns `503 degraded` otherwise, and it never exposes secrets.

### 6. Safety and honesty

- Consent is required before upload or recording.
- The API independently requires `consent=true`.
- Speaker suggestions require explicit self-identification.
- Renames never rewrite evidence quotes.
- Share links are read-only, noindex, and `Cache-Control: no-store`.
- The service worker never caches private reports, audio, or API responses.
- Missing integrations are shown as unconfigured, never simulated.

### 7. Local development

```bash
npm install
cp .env.example .env.local
# Fill in MONGODB_URI, SESSION_SECRET, transcription, Gemma, ElevenLabs
npm run dev
```

Useful commands:

```bash
npm run typecheck
npm test
npm run build
npm run start
```

The full Atlas + Whisper + Gemma + Render walkthrough is in
[`DEPLOYMENT.md`](https://github.com/Ayush-Barai/MeetBrief/blob/main/DEPLOYMENT.md).

---

## Why Does Open Innovation Matter?

Meeting recordings are some of the most sensitive data a team produces. They
contain pricing, hiring, legal risk, customer names, and things people said
without expecting a transcript.

A closed transcription API means sending all of that to a vendor you cannot
inspect, self-host, or replace. Open-source Whisper changes the trade-off: you
can run the model on your own machine or VPS, keep the audio inside your
infrastructure, and choose the model size that fits your hardware. Open-weight
Gemma does the same for analysis. The app can still use hosted services where
they add value — ElevenLabs for voice quality, MongoDB Atlas for managed
storage, Render for deployment — without making the core intelligence a black
box.

Open innovation also makes the safety story auditable. The prompt, the
validation schema, the evidence reconciliation, and the speaker-rename rules are
all in the repository. If you disagree with how a claim is accepted, you can read
the code and change it. That is much harder with a hosted pipeline that returns a
confident paragraph and no trail.

For me, the best open-source AI projects are not demos that happen to use an open
model. They are products where the open model is a deliberate architectural
choice that gives the user more control.

---

## My Agent Session

I used an AI coding agent (OpenCode) during the build. The useful part was not
“generate the whole app.” It was the narrow, verifiable work:

- tracing every reference to the old transcription provider before removing it;
- rewriting the Whisper adapter to parse optional diarization labels;
- checking that speaker renames still propagate through reports, actions,
  exports, and the recap script;
- updating the setup page, environment example, Render blueprint, and README;
- running typecheck, tests, and a production build after each change;
- capturing the screenshots from the running production build.

The human judgment stayed human: which provider to remove, what “open source”
should mean for this project, which claims are safe to show in a demo, and what
the post should admit about unverified credentials.

---

## The Lazy Payoff

The lazy payoff is that I no longer leave a call and spend twenty minutes
reconstructing what happened. The app produces the first draft of the record:
summary, decisions, owners, deadlines, and a recap script.

The next automation I would add is a durable processing queue. Right now
processing runs through Next.js `after()`, which is fine for a demo but can be
interrupted by a Render restart. A worker with a heartbeat/lease would make long
meetings reliable. After that: real multi-user auth, a retention/deletion job,
and per-user storage quotas.

---

## Prize Categories

I would like this project considered for:

- **Gemma** — evidence-linked meeting analysis through an OpenAI-compatible
  Gemma endpoint, with Zod validation and transcript reconciliation.
- **MongoDB Atlas** — meetings, transcript segments, reports, actions, share
  hashes, and GridFS audio in one managed database.
- **ElevenLabs** — on-demand spoken recaps generated from the edited report.
- **Render** — a production-style Next.js deployment with a health check and a
  blueprint.

---

## What Is Real and What Is Demo

I want to be precise about the state of the project:

- The demo report, transcript, speaker suggestions, and recap script are
  fictional and clearly labeled.
- The screenshots were captured from a real local production build with
  integrations intentionally unconfigured.
- The code path for transcription, Gemma analysis, MongoDB persistence, and
  ElevenLabs recaps is implemented against real APIs.
- The full end-to-end flow has **not** been executed in this workspace with live
  credentials. Missing configuration is surfaced in `/setup`, `/api/health`, and
  processing responses instead of being simulated.
- Unit tests, TypeScript checks, and the production build pass locally.

That distinction matters. A demo should show the product honestly, not borrow
credibility from an AI call that never happened.

---

## Image Attachment Table

Upload these files from `post-images/` and place them at the matching points in
the post:

| # | File | Used for |
| --- | --- | --- |
| 1 | `post-images/01-landing.png` | Cover / landing page |
| 2 | `post-images/02-new-meeting.png` | Create a meeting form |
| 3 | `post-images/03-demo-overview.png` | Demo report overview |
| 4 | `post-images/04-demo-speakers.png` | Speaker panel |
| 5 | `post-images/05-demo-transcript.png` | Transcript with speaker labels |
| 6 | `post-images/06-demo-decisions.png` | Decisions with evidence |
| 7 | `post-images/07-demo-actions.png` | Action items with owners |
| 8 | `post-images/08-demo-recap.png` | Audio recap script |
| 9 | `post-images/09-setup.png` | Integration setup status |

Suggested tags: `#hacktoberfest`, `#opensource`, `#ai`, `#webdev`.

Thanks for reading. If you try MeetBrief, start with `/demo` — no account and no
recording required.
