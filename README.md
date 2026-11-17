# Steadfast

A personal deadman switch. It checks in with you on a schedule; if you don't
respond, it escalates through a ladder of increasingly aggressive attempts to
reach you, and finally notifies your emergency contacts (and runs any other
actions you've configured, like a webhook).

Built as a single-user tool for now. The data model and auth are already
structured so it could become multi-tenant SaaS later without a rewrite, but
that's explicitly out of scope for this build.

## How it works

1. **Check-in.** On your schedule (e.g. every day), Steadfast sends you a
   check-in over the channels you choose (email, text, push). It includes a
   link you click to confirm you're OK.
2. **Grace period.** If you don't confirm within your configured grace
   period, the cycle becomes "escalating."
3. **Escalation ladder.** You define an ordered list of steps, each with its
   own delay (minutes/hours/days) and its own set of actions — email, text,
   phone call (with a spoken message), or a webhook. Steps fire one after
   another until one marked "final" runs.
4. **Conclusion.** Once the final step fires, the cycle is "concluded." You
   reset it yourself (from the dashboard) once you're back — it never
   silently restarts on its own after concluding.
5. At any point — including after conclusion — clicking "I'm OK" (or the
   emailed/texted link) resolves the current cycle and immediately starts
   the next one.

Nothing runs until you explicitly activate the switch from the dashboard,
and pausing it immediately stops any in-flight escalation.

## Security

- All contact emails/phone numbers, and any webhook URLs/headers, are
  encrypted at rest (AES-256-GCM) with a key you control (`MASTER_KEY`) —
  never stored in plaintext in the database.
- Sessions are signed, `httpOnly`, `SameSite=Lax` cookies; passwords are
  hashed with bcrypt.
- Every mutating API route checks the request's `Origin` header matches the
  app's own origin (CSRF defense) in addition to requiring a valid session.
- Login attempts are rate-limited per email.
- There is exactly one admin account. There's no public sign-up — `/setup`
  only works once, before any account exists.

**You are responsible for keeping `MASTER_KEY` and `SESSION_SECRET` safe.**
If you lose `MASTER_KEY`, encrypted data (contacts, webhook configs) becomes
unrecoverable. Back it up somewhere safe and separate from the database.

## Local development

```bash
npm install
cp .env.example .env
```

Generate the two required secrets and put them in `.env`:

```bash
openssl rand -base64 32   # → MASTER_KEY
openssl rand -base64 32   # → SESSION_SECRET
```

Everything else in `.env` is optional for local dev — without Resend/Twilio/
VAPID keys configured, emails, texts, calls, and push notifications are
logged to the console instead of actually sent, so you can exercise the
whole flow with no external accounts.

Set up the database:

```bash
npx prisma db push
```

Run the app and the scheduler worker in two terminals:

```bash
npm run dev      # the web app, http://localhost:3000
npm run worker   # the background scheduler — required for check-ins and
                  # escalation to actually fire; the web app alone won't
                  # do this on its own
```

Open `http://localhost:3000`, which redirects you to `/setup` to create your
one admin account.

## Configuring real notification channels

All of these are optional and independent — enable whichever you want.

- **Email** — [Resend](https://resend.com). Set `RESEND_API_KEY` and
  `RESEND_FROM_EMAIL` (a verified sending address/domain).
- **SMS & voice calls** — [Twilio](https://twilio.com). Set
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and a phone number you've
  bought in Twilio as `TWILIO_SMS_FROM_NUMBER` (and optionally a separate
  `TWILIO_VOICE_FROM_NUMBER`). Voice calls play a spoken message via
  Twilio's text-to-speech — there's no need to record anything yourself.
- **Push notifications** — generate a VAPID key pair with
  `npx web-push generate-vapid-keys` and set `VAPID_PUBLIC_KEY` /
  `VAPID_PRIVATE_KEY`. Then enable it per-device under Settings →
  Notifications (this installs a small service worker in your browser).
- **"Post to my website" / anything else** — use a webhook action under
  Settings → Actions. Point it at whatever accepts an HTTP request on your
  end (a Wix/WordPress automation endpoint, a Zapier/Make webhook, your own
  server, etc.) — Steadfast just POSTs JSON to a URL you provide, with your
  own headers if you need auth. This is deliberately generic since the
  details vary a lot by platform.
- **Changing a voicemail greeting** is carrier/provider-specific enough that
  it isn't built in directly — route it through a webhook action to
  whatever service manages your voicemail (if that service itself has an
  API), or through a Twilio Studio flow if your number is already a Twilio
  number.

## Deploying

The one thing that matters most for a deadman switch: **the scheduler needs
to run continuously and on time.** `npm run worker` is a long-lived Node
process that ticks every 30 seconds — it is not a serverless function, and
intentionally so. Serverless cron (e.g. Vercel Cron) has coarse granularity
and no strong guarantee it won't be delayed by a cold start, which is a bad
trade for a safety tool.

Recommended: deploy to a host that runs persistent containers/processes
(Fly.io, Railway, Render, a small VPS, etc.) with **two processes**:

- `npm run build && npm run start` — the web app
- `npm run worker` — the scheduler (same codebase, same `.env`, same
  database)

Both need the same `DATABASE_URL`, `MASTER_KEY`, and `SESSION_SECRET`.

For production:

- Use a real `APP_BASE_URL` (your deployed domain, `https://...`) so
  check-in links in emails/texts point to the right place.
- SQLite is fine for a single-user tool but lives on local disk — make sure
  your host's volume is persistent and back it up. (If you outgrow it,
  swapping the Prisma datasource provider to Postgres is a contained
  change — the schema and app code don't assume SQLite specifically.)
- Set `NODE_ENV=production` (most hosts do this automatically) so session
  cookies are marked `Secure`.

## What this is (and isn't)

This is a personal-use tool, not a hosted multi-tenant service — there's one
admin account, one schedule, one escalation ladder. Pricing/cost estimates
for turning this into a sold service were discussed separately; this build
deliberately keeps that complexity out so the core safety mechanism stays
simple to reason about and verify.
