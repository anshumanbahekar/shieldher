#!/bin/bash
# ============================================
# ShieldHer — Complete Setup Script
# Run: bash setup.sh
# Takes you from zero to live in one script
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

print_step() { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     🛡️  ShieldHer Setup Script        ║${NC}"
echo -e "${BOLD}║     World Product Day 2026            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""

# STEP 1 — Prerequisites
print_step "STEP 1 — Checking prerequisites"
if ! command -v node &> /dev/null; then print_error "Node.js not found. Install from https://nodejs.org (v18+)"; exit 1; fi
print_success "Node.js $(node -v) found"
if ! command -v npm &> /dev/null; then print_error "npm not found"; exit 1; fi
print_success "npm $(npm -v) found"

# STEP 2 — Install dependencies
print_step "STEP 2 — Installing dependencies (2-3 min)"
npm install
npm install sharp --save-dev --silent
print_success "All dependencies installed"

# STEP 3 — Environment variables
print_step "STEP 3 — Setting up environment variables"
if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  print_success ".env.local created"
else
  print_warn ".env.local already exists"
fi

echo ""
echo -e "${YELLOW}${BOLD}Fill in .env.local with these credentials:${NC}"
echo ""
echo "  1. SUPABASE     → https://supabase.com (free)"
echo "     NEXT_PUBLIC_SUPABASE_URL"
echo "     NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "     SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "  2. MAPBOX       → https://mapbox.com (free tier)"
echo "     NEXT_PUBLIC_MAPBOX_TOKEN"
echo ""
echo "  3. TWILIO       → https://twilio.com (trial works)"
echo "     TWILIO_ACCOUNT_SID"
echo "     TWILIO_AUTH_TOKEN"
echo "     TWILIO_PHONE_NUMBER (+1xxxxxxxxxx)"
echo "     TWILIO_WHATSAPP_NUMBER (whatsapp:+14155238886)"
echo ""
echo "  4. ANTHROPIC    → https://console.anthropic.com"
echo "     ANTHROPIC_API_KEY"
echo ""
echo "  5. NOVUS.AI ⚠️  REQUIRED FOR HACKATHON"
echo "     → https://novus.ai → Create project → Copy ID"
echo "     NEXT_PUBLIC_NOVUS_PROJECT_ID"
echo ""
echo "  6. VAPID KEYS   → https://vapidkeys.com (free)"
echo "     NEXT_PUBLIC_VAPID_PUBLIC_KEY"
echo "     VAPID_PRIVATE_KEY"
echo "     VAPID_SUBJECT (mailto:your@email.com)"
echo ""
read -p "Press ENTER once .env.local is filled in..." dummy

# STEP 4 — Generate encryption key
print_step "STEP 4 — Generating AES-256 encryption key"
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
if grep -q "your_64_char_hex_key" .env.local 2>/dev/null; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/your_64_char_hex_key/$ENCRYPTION_KEY/" .env.local
  else
    sed -i "s/your_64_char_hex_key/$ENCRYPTION_KEY/" .env.local
  fi
  print_success "Encryption key generated: ${ENCRYPTION_KEY:0:16}..."
else
  print_warn "Encryption key already set"
fi

# STEP 5 — App URL
print_step "STEP 5 — App URL"
echo ""
read -p "Enter your Vercel URL (or press ENTER to use localhost for now): " APP_URL
if [ ! -z "$APP_URL" ]; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|http://localhost:3000|$APP_URL|g" .env.local
  else
    sed -i "s|http://localhost:3000|$APP_URL|g" .env.local
  fi
  print_success "App URL set to $APP_URL"
fi

# STEP 6 — Generate PWA icons
print_step "STEP 6 — Generating PWA icons"
node scripts/generate-icons.js
print_success "All icons generated in public/icons/"

# STEP 7 — Ambient sounds info
print_step "STEP 7 — Ambient sounds for fake call"
echo ""
echo "  Download 4 ambient sound MP3 files and put them in public/sounds/:"
echo ""
echo "  • ambient-office.mp3  → freesound.org search: office ambience"
echo "  • ambient-cafe.mp3    → freesound.org search: cafe ambience"
echo "  • ambient-street.mp3  → freesound.org search: street ambience"
echo "  • ambient-home.mp3    → freesound.org search: home ambience"
echo ""
echo "  Free source: https://freesound.org or https://pixabay.com/sound-effects"
echo "  Keep each file under 500KB, 30-60 seconds long"
echo ""
print_warn "Do this manually — fake call still works without these (just silent)"

# STEP 8 — Supabase migrations
print_step "STEP 8 — Supabase database setup"
echo ""
echo -e "${BOLD}Run these 3 SQL files in Supabase SQL Editor:${NC}"
echo "  → https://supabase.com/dashboard → Your project → SQL Editor"
echo ""
echo "  1. Copy + paste: supabase/migrations/001_initial_schema.sql"
echo "     (creates all tables, RLS policies, triggers)"
echo ""
echo "  2. Copy + paste: supabase/migrations/002_seed_emergency_numbers.sql"
echo "     (seeds 130+ countries' emergency numbers)"
echo ""
echo "  3. Copy + paste: supabase/migrations/003_push_and_tokens.sql"
echo "     (push subscriptions, dashboard tokens)"
echo ""
echo "  Then in Supabase Dashboard → Realtime → enable for:"
echo "  location_pings, sos_alerts, journeys, check_ins"
echo ""
read -p "Press ENTER once all 3 migrations are done..." dummy
print_success "Database migrations confirmed"

# STEP 9 — Edge Functions
print_step "STEP 9 — Supabase Edge Functions"
echo ""
if command -v supabase &> /dev/null; then
  read -p "Enter your Supabase project ref (from dashboard URL): " PROJECT_REF
  if [ ! -z "$PROJECT_REF" ]; then
    supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true
    supabase functions deploy check-in-monitor 2>/dev/null && print_success "check-in-monitor deployed" || print_warn "Deploy failed — do it manually in dashboard"
    supabase functions deploy sos-escalation 2>/dev/null && print_success "sos-escalation deployed" || print_warn "Deploy failed — do it manually in dashboard"
    echo ""
    echo "  ⚠️  Schedule check-in-monitor:"
    echo "  Dashboard → Edge Functions → check-in-monitor → Schedule"
    echo "  Cron: * * * * *"
  fi
else
  echo "  Install Supabase CLI: npm install -g supabase"
  echo "  Then: supabase link --project-ref YOUR_REF"
  echo "  Then: supabase functions deploy check-in-monitor"
  echo "  Then: supabase functions deploy sos-escalation"
  echo ""
  print_warn "Skipped — install CLI and run manually"
fi

# STEP 10 — Test build
print_step "STEP 10 — Testing build"
echo ""
npm run build 2>&1 | tail -30
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  print_success "Build passed!"
else
  print_warn "Build errors above — fix before deploying"
  echo "  Common fixes:"
  echo "  → Run: npm run build 2>&1 | head -50"
  echo "  → Check all .env.local keys are filled"
fi

# STEP 11 — Deploy
print_step "STEP 11 — Deploy to Vercel"
echo ""
if ! command -v vercel &> /dev/null; then
  echo "  Installing Vercel CLI..."
  npm install -g vercel
fi

read -p "  Deploy to Vercel now? (y/n): " DEPLOY_NOW
if [ "$DEPLOY_NOW" = "y" ] || [ "$DEPLOY_NOW" = "Y" ]; then
  vercel --prod
  echo ""
  print_warn "Add ALL .env.local variables to Vercel:"
  echo "  Vercel Dashboard → Project → Settings → Environment Variables"
  echo "  Copy every line from .env.local into Vercel"
else
  echo "  Run 'vercel' when ready"
fi

# STEP 12 — Novus confirmation
print_step "STEP 12 — Novus.ai verification"
echo ""
echo "  1. Open your deployed app URL"
echo "  2. Sign up + complete onboarding"
echo "  3. Go to https://novus.ai → your project dashboard"
echo "  4. You should see events appearing (page_view, onboarding_completed)"
echo "  5. SCREENSHOT the dashboard — required for submission"
echo ""
read -p "  Press ENTER once you've verified Novus is tracking..." dummy
print_success "Novus.ai verified"

# DONE
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║   🛡️  ShieldHer is LIVE. Go win. 🏆      ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}Submission checklist (before June 20):${NC}"
echo ""
echo "  □ Public URL live and working"
echo "  □ Novus.ai dashboard screenshot saved"
echo "  □ 20+ real users (share with friends/family NOW)"
echo "  □ Record 2-3 min demo video:"
echo "      0:00 Problem statement"
echo "      0:20 Dashboard overview"
echo "      0:35 Hold SOS → contacts notified (show the SMS)"
echo "      1:00 Contact tracking page (live map)"
echo "      1:20 Journey mode"
echo "      1:35 Fake call ringing"
echo "      1:50 AI companion ('I'm being followed')"
echo "      2:10 Journal + safety map"
echo "      2:30 Novus dashboard with real data"
echo "  □ Submit at Devpost before June 20, 5:00 PM GMT"
echo ""
echo -e "  ${GREEN}You've got this Tony. 🛡️${NC}"
echo ""
