# Deploy MeetBrief AI: MongoDB Atlas + Render

This guide takes you from a fresh clone to a running deployment. MeetBrief uses
four services:

| Service | Role | Required? |
| --- | --- | --- |
| **MongoDB Atlas** | Meeting metadata, transcripts, reports, actions, GridFS audio | Yes, for real meetings |
| **Open-source Whisper** | Speech-to-text through an OpenAI-compatible API | Yes, for processing |
| **Gemma** | Structured, evidence-linked meeting report | Yes, for processing |
| **ElevenLabs** | Optional spoken recap | No |

The app never simulates a provider result. If a service is missing, `/setup` and
`/api/health` report it as unconfigured.

---

## 1. Create MongoDB Atlas

1. Sign in at <https://www.mongodb.com/cloud/atlas> and create a project.
2. Click **Create** and choose the **M0 Free** cluster (or a larger tier for
   production). Pick a region close to your Render region.
3. Under **Database Access**, add a database user:
   - Authentication: **Password**
   - Username: `meetbrief`
   - Password: generate a strong password and save it.
4. Under **Network Access**, add an IP address:
   - For a quick MVP: `0.0.0.0/0` (allow from anywhere).
   - For production: restrict access to Render's outbound IPs. Render's shared
     outbound IPs are not stable; use a paid static outbound IP or a private
     networking setup if you need tight restrictions.
5. Click **Connect → Drivers → Node.js**. Copy the connection string:

   ```text
   mongodb+srv://meetbrief:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. Replace `<password>` with the database user's password. If the password
   contains `@`, `:`, `/`, or `?`, URL-encode it first.
7. Add the database name to the path (recommended):

   ```text
   mongodb+srv://meetbrief:<password>@cluster0.xxxxx.mongodb.net/meetbrief?retryWrites=true&w=majority
   ```

8. Use this as `MONGODB_URI`. Keep `MONGODB_DB_NAME=meetbrief`.

Collections and indexes are created lazily on first use. Recordings and recap
MP3s live in the GridFS bucket `meeting_files`, so they count toward Atlas
storage. The free M0 tier is fine for a demo; use a larger tier for real
meetings and enable backups/alerts.

**Test it before deploying:**

```bash
# Optional: use mongosh if installed
mongosh "mongodb+srv://meetbrief:<password>@cluster0.xxxxx.mongodb.net/meetbrief"
```

Or start the app locally with the URI and open `http://localhost:3000/api/health`.
A configured, reachable database returns HTTP 200 with `"status":"ok"`.

---

## 2. Run the open-source Whisper service

MeetBrief sends audio to any OpenAI-compatible `POST /audio/transcriptions`
endpoint. The recommended option is **ScribeCrate**
(`hwdsl2/whisper-server`), which wraps `faster-whisper` and supports local
speaker diarization.

### Option A — Docker on a VPS (recommended)

Use a Linux VPS with at least 2 GB RAM (4 GB+ for `large-v3-turbo`), Docker, and
a domain name.

```bash
docker run -d --name whisper \
  --restart=always \
  -p 127.0.0.1:9000:9000 \
  -e WHISPER_MODEL=large-v3-turbo \
  -e WHISPER_DIARIZATION=true \
  -e WHISPER_API_KEY=replace-with-a-long-random-key \
  -e WHISPER_THREADS=4 \
  -v whisper-data:/var/lib/whisper \
  hwdsl2/whisper-server
```

Put Caddy or nginx in front of it for HTTPS. Caddy example:

```caddyfile
whisper.example.com {
  reverse_proxy 127.0.0.1:9000
}
```

Then set:

```dotenv
TRANSCRIPTION_API_URL=https://whisper.example.com/v1
TRANSCRIPTION_API_KEY=replace-with-a-long-random-key
TRANSCRIPTION_MODEL=whisper-1
TRANSCRIPTION_TIMEOUT_MS=600000
```

`WHISPER_MODEL=large-v3-turbo` is a good accuracy/speed balance. The
`WHISPER_DIARIZATION=true` flag adds a `speaker` field to each segment, which
MeetBrief converts to `Person 1`, `Person 2`, etc. Without it, every segment is
`Person 1`.

Verify the server:

```bash
curl https://whisper.example.com/v1/models \
  -H "Authorization: Bearer replace-with-a-long-random-key"
```

### Option B — Render Docker service

You can run ScribeCrate on Render as a second service, but it needs a paid
instance with enough RAM and a persistent disk for the model cache. A minimal
blueprint service looks like this:

```yaml
services:
  - type: web
    name: meetbrief-whisper
    runtime: docker
    plan: standard
    region: oregon
    dockerContext: .
    dockerfilePath: ./Dockerfile.whisper
    envVars:
      - key: WHISPER_MODEL
        value: small
      - key: WHISPER_DIARIZATION
        value: "true"
      - key: WHISPER_API_KEY
        generateValue: true
    disk:
      name: whisper-data
      mountPath: /var/lib/whisper
      sizeGB: 10
```

`Dockerfile.whisper`:

```dockerfile
FROM hwdsl2/whisper-server:latest
```

This is not included in the repository because it doubles deployment cost.
For a hackathon demo, a VPS or a short-lived local tunnel is usually cheaper.
Do **not** point `TRANSCRIPTION_API_URL` at `localhost` from Render — that
resolves to the Render container, not your laptop.

### Option C — Local tunnel (demo only)

Run ScribeCrate locally and expose it with a tunnel (Cloudflare Tunnel, ngrok,
or Tailscale Funnel). Use the public HTTPS URL as `TRANSCRIPTION_API_URL`.
This is fine for a short demo, not for production.

### Other compatible servers

- `faster-whisper-server` / **Speaches**
- **whisper.cpp** server
- **vLLM** with a Whisper model

If the server returns `segments[].speaker`, diarization works automatically. If
it does not, MeetBrief labels all segments `Person 1` and records
`diarized: false` in the transcript metadata.

---

## 3. Run Gemma

MeetBrief expects an OpenAI-compatible `/chat/completions` endpoint serving a
Gemma model. Use the base URL or the full `/chat/completions` URL.

### Option A — Hosted OpenAI-compatible Gemma

Use a provider that serves Gemma with an OpenAI-compatible API (for example
Google Vertex AI Model Garden, Together, Fireworks, OpenRouter, or Hugging Face
Inference Providers). Set:

```dotenv
GEMMA_API_URL=https://provider.example.com/v1
GEMMA_API_KEY=...
GEMMA_MODEL=gemma-3-27b-it
GEMMA_TIMEOUT_MS=180000
```

The exact model ID depends on the provider. The endpoint must accept
`POST /chat/completions` with `messages`, `temperature`, and `max_tokens`.

### Option B — Self-hosted Ollama on a GPU VPS

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull gemma3:12b
OLLAMA_HOST=127.0.0.1:11434 ollama serve
```

Put HTTPS in front of it (Caddy/nginx), then set:

```dotenv
GEMMA_API_URL=https://gemma.example.com/v1
GEMMA_API_KEY=
GEMMA_MODEL=gemma3:12b
GEMMA_TIMEOUT_MS=180000
```

Use `gemma3:27b` if the machine has enough VRAM/RAM. `gemma3:4b` is a fallback
for small CPU-only demos, but report quality and JSON reliability drop.

### Option C — Render Docker service with Ollama

A Render service with a persistent disk can run Ollama, but Gemma needs
significant RAM. Choose an instance with at least 8 GB for `gemma3:4b` and much
more for larger models. The first request is slow while the model loads.

> `GEMMA_API_URL` must be reachable **from Render**. A `localhost` Ollama
> instance on your laptop is not reachable from the deployed app without a
> tunnel or public endpoint.

---

## 4. Configure ElevenLabs (optional)

1. Create an API key at <https://elevenlabs.io>.
2. Copy a voice ID from the voice library or your workspace.
3. Set:

   ```dotenv
   ELEVENLABS_API_KEY=...
   ELEVENLABS_VOICE_ID=...
   ELEVENLABS_MODEL_ID=eleven_multilingual_v2
   ```

Recaps are generated on demand and stored in GridFS. The recap script is saved
even if TTS fails, so it can be reviewed or retried.

---

## 5. Deploy on Render

1. Push this repository to GitHub.
2. In Render, click **New → Blueprint** and select the repository. Render reads
   `render.yaml`.
3. Fill in the variables marked `sync: false`:

   | Variable | Value |
   | --- | --- |
   | `MONGODB_URI` | Atlas connection string |
   | `NEXT_PUBLIC_APP_URL` | Your Render URL, e.g. `https://meetbrief-ai.onrender.com` |
   | `TRANSCRIPTION_API_URL` | Public Whisper base URL, e.g. `https://whisper.example.com/v1` |
   | `TRANSCRIPTION_API_KEY` | Whisper Bearer token, if required |
   | `GEMMA_API_URL` | Gemma base URL |
   | `GEMMA_API_KEY` | Gemma key, if required |
   | `ELEVENLABS_API_KEY` | ElevenLabs key, if using recaps |
   | `ELEVENLABS_VOICE_ID` | ElevenLabs voice ID, if using recaps |

4. Keep the generated `SESSION_SECRET`. Changing it invalidates existing browser
   sessions.
5. Deploy with:

   - **Build command:** `npm ci && npm run build`
   - **Start command:** `npm run start`
   - **Health check:** `/api/health`

6. After the first deploy, set `NEXT_PUBLIC_APP_URL` to the final URL and
   redeploy so share links use the correct origin.

### Render settings that matter

- **Region:** choose the same region as Atlas and your AI services to reduce
  latency.
- **Instance:** the Starter plan is enough for the Next.js app. Whisper and Gemma
  should run on separate services or machines.
- **Disk:** the app itself does not need a persistent disk; recordings live in
  Atlas GridFS.
- **Request size:** keep `MAX_UPLOAD_MB` below Render's request limit and your
  Atlas storage budget. The default is 60 MB.
- **Spin-down:** free instances sleep. Long transcriptions and recaps may be
  interrupted; use a paid instance for demos.
- **In-process jobs:** processing runs through Next.js `after()`. A deploy or
  restart can interrupt a job. The meeting stays in `processing`; retry from the
  UI after the service is healthy.

### Health check behavior

- `200 ok` — MongoDB is configured and reachable.
- `503 degraded` — MongoDB is missing or unreachable.

The response includes integration booleans (`transcription`, `gemma`,
`elevenlabs`, `auth`) without exposing secrets.

---

## 6. Verify the deployment

1. Open `https://your-app.onrender.com/api/health` and confirm `"status":"ok"`.
2. Open `/setup` and confirm MongoDB, transcription, and Gemma are configured.
3. Create a short meeting recording (10–30 seconds) and confirm:
   - The transcript appears with timestamps.
   - Speakers are `Person 1`, `Person 2`, etc. (if diarization is enabled).
   - The report has decisions, actions, and evidence timestamps.
   - Renaming a speaker updates the transcript, report, actions, and exports.
4. Generate a recap if ElevenLabs is configured.
5. Enable a share link and open it in a private window.

---

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `/api/health` returns 503 | Check `MONGODB_URI`, the Atlas user password, and Network Access. |
| `MongoServerError: bad auth` | Reset the Atlas user password and URL-encode special characters. |
| Transcription returns 503 | `TRANSCRIPTION_API_URL` is missing. Set it in Render and redeploy. |
| `Could not reach the transcription endpoint` | The Whisper URL is not public, is down, or blocks Render. Test it with `curl` from another network. |
| Transcription times out | Raise `TRANSCRIPTION_TIMEOUT_MS`, use a smaller/faster model, or give the server more CPU. |
| Everyone is `Person 1` | Diarization is disabled on the Whisper server. Set `WHISPER_DIARIZATION=true` and restart it. |
| Gemma returns invalid JSON | Use a larger Gemma model, raise `GEMMA_TIMEOUT_MS`, or shorten the recording. |
| Gemma unreachable | `GEMMA_API_URL` points at `localhost` or a private network. Use a public HTTPS endpoint. |
| Recap fails but the script exists | Check the ElevenLabs key, voice ID, and quota, then retry. |
| Share link 404 after redeploy | The link was revoked, or the meeting was deleted. |
| Session lost after deploy | `SESSION_SECRET` changed. Set a stable value. |

---

## 8. Production checklist

- [ ] Strong, stable `SESSION_SECRET`
- [ ] `NEXT_PUBLIC_APP_URL` matches the deployed origin
- [ ] Atlas network access restricted as tightly as practical
- [ ] Atlas backups and alerts enabled
- [ ] Atlas tier sized for GridFS audio storage
- [ ] Whisper server protected with an API key and HTTPS
- [ ] Gemma endpoint protected and reachable from Render
- [ ] `MAX_UPLOAD_MB` aligned with Render limits
- [ ] `/api/health` monitored
- [ ] Retention/deletion policy defined
- [ ] ElevenLabs quota monitored (if enabled)
