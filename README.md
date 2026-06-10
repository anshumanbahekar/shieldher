# 🛡️ ShieldHer — Real-time Women Safety Platform

> Built for Mind the Product's World Product Day Hackathon 2026

## Setup (< 10 minutes)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# Fill in your keys (see below)
```

### 3. Set up Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Run migration: paste `supabase/migrations/001_initial_schema.sql` into SQL editor
3. Enable Realtime for: `location_pings`, `sos_alerts`, `journeys`, `check_ins`
4. Copy URL + anon key to `.env.local`

### 4. Set up Twilio
1. Create account at [twilio.com](https://twilio.com)
2. Get a phone number with SMS + WhatsApp capabilities
3. Copy Account SID, Auth Token, phone number to `.env.local`

### 5. Set up Mapbox
1. Create account at [mapbox.com](https://mapbox.com)
2. Create a public token
3. Add to `NEXT_PUBLIC_MAPBOX_TOKEN`

### 6. Set up Anthropic (AI Companion)
1. Get API key at [console.anthropic.com](https://console.anthropic.com)
2. Add to `ANTHROPIC_API_KEY`

### 7. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/               # Login, signup, onboarding
│   ├── dashboard/          # Main home screen
│   ├── sos/                # SOS trigger screen
│   ├── journey/            # Journey mode
│   ├── fake-call/          # Fake call feature
│   ├── journal/            # Incident journal
│   ├── map/                # Safety community map
│   ├── contacts/           # Trusted circle management
│   ├── companion/          # AI safety companion
│   ├── emergency/          # Emergency numbers (offline)
│   └── settings/           # App settings
├── components/             # Reusable UI components
├── lib/
│   ├── supabase/           # DB clients (browser + server)
│   ├── hooks/              # useLocation, useShake, useVoiceSOS
│   ├── types/              # TypeScript interfaces
│   └── utils/              # Encryption, helpers
└── stores/                 # Zustand global state
```

## Key Features
- 🆘 **One-tap SOS** — SMS + WhatsApp alerts with live GPS
- 📍 **Live location** — Real-time map for trusted contacts
- 🚗 **Journey mode** — Share trip, auto-detect deviation
- 📞 **Elite fake call** — Realistic incoming call with audio
- 🎙️ **Voice SOS** — Hands-free trigger phrase
- 📳 **Shake SOS** — 3 shakes = instant alert
- 🎭 **Disguise mode** — App looks like calculator
- 🤖 **AI companion** — Claude-powered 24/7 support
- 📖 **Journal** — E2E encrypted incident log
- 🗺️ **Safety map** — Anonymous community reports
- 🌍 **195 countries** — Offline emergency numbers
