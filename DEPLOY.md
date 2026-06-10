# 🚀 ShieldHer — Complete Deployment Guide
## World Product Day 2026 Hackathon

---

## ⏱️ Total setup time: ~45 minutes

---

## STEP 1 — Clone & Install (5 min)

```bash
cd shieldher
npm install
cp .env.example .env.local
```

---

## STEP 2 — Supabase Setup (10 min)

1. Go to [supabase.com](https://supabase.com) → New project
2. Name it `shieldher`, pick a strong password, choose region closest to you
3. Go to **SQL Editor** and run migrations in order:
   - Paste & run `supabase/migrations/001_initial_schema.sql`
   - Paste & run `supabase/migrations/002_seed_emergency_numbers.sql`
   - Paste & run `supabase/migrations/003_push_and_tokens.sql`
4. Go to **Project Settings → API**:
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`
5. Go to **Realtime** → Enable for tables: `location_pings`, `sos_alerts`, `journeys`, `check_ins`
6. Go to **Authentication → Providers** → Enable Google OAuth

---

## STEP 3 — Twilio Setup (5 min)

1. [twilio.com](https://twilio.com) → Create account
2. Get a phone number with SMS capability
3. For WhatsApp: Go to **Messaging → Try it Out → WhatsApp** → Follow sandbox setup
4. Copy to `.env.local`:
   ```
   TWILIO_ACCOUNT_SID=ACxxx
   TWILIO_AUTH_TOKEN=xxx
   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

---

## STEP 4 — Mapbox Setup (3 min)

1. [mapbox.com](https://mapbox.com) → Create account → Create token
2. Copy to `.env.local`:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
   ```

---

## STEP 5 — Anthropic Setup (2 min)

1. [console.anthropic.com](https://console.anthropic.com) → Create API key
2. Copy to `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxx
   ```

---

## STEP 6 — Novus.ai Setup (2 min) ⚠️ REQUIRED FOR HACKATHON

1. Go to [novus.ai](https://novus.ai) → Create project
2. Get your Project ID
3. Copy to `.env.local`:
   ```
   NEXT_PUBLIC_NOVUS_PROJECT_ID=your_project_id
   ```
4. Add `<NovusScript />` to your layout head (already included in `layout.tsx`)
5. **Take a screenshot of your Novus dashboard for submission**

---

## STEP 7 — Generate Assets (5 min)

```bash
# Install sharp for icon generation
npm install sharp --save-dev

# Generate all PWA icons
node scripts/generate-icons.js

# Set up ambient sounds (see instructions)
node scripts/setup-sounds.js
```

---

## STEP 8 — Deploy to Vercel (5 min)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add all environment variables in Vercel dashboard
# Settings → Environment Variables → Add each from .env.local
```

Or connect your GitHub repo to Vercel for auto-deployments.

---

## STEP 9 — Deploy Supabase Edge Functions (5 min)

```bash
# Install Supabase CLI
npm install supabase --global

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy check-in monitor
supabase functions deploy check-in-monitor

# Deploy SOS escalation
supabase functions deploy sos-escalation

# Schedule check-in monitor (every minute)
# Go to Supabase Dashboard → Edge Functions → check-in-monitor → Schedule
# Cron: * * * * *
```

---

## STEP 10 — Test Everything (5 min)

```bash
# Local test
npm run dev
```

**Test checklist:**
- [ ] Sign up + onboarding completes
- [ ] Add a trusted contact
- [ ] SOS button hold triggers (check console for Twilio logs)
- [ ] Journey mode starts + location pings every 5s
- [ ] Fake call rings after delay
- [ ] AI companion responds (streaming)
- [ ] Journal entry saves + decrypts
- [ ] Safety map shows pins
- [ ] Emergency numbers load offline
- [ ] Disguise calculator renders + 0000= triggers SOS
- [ ] Novus dashboard shows events

---

## FINAL CHECKLIST FOR SUBMISSION

- [ ] Public URL is live and accessible
- [ ] Novus.ai dashboard screenshot ready
- [ ] 2-3 min demo video recorded
- [ ] Submit at Devpost before June 20 5:00 PM GMT

---

## 🛑 Common Issues

**Location not working?**
→ Must use HTTPS in production. Vercel handles this automatically.

**Twilio not sending?**
→ Check Twilio console logs. Ensure phone numbers are in E.164 format (+1xxxxxxxxxx).

**Map not loading?**
→ Check Mapbox token is correct and not expired.

**Build failing?**
→ Run `npm run build` locally first to catch TypeScript errors.

**SOS not triggering shake?**
→ Android requires HTTPS. iOS 13+ requires DeviceMotion permission prompt.
