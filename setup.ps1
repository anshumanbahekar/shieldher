# ShieldHer - Windows Setup Script
# Run: PowerShell -ExecutionPolicy Bypass -File .\setup.ps1

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   ShieldHer Setup - World Product Day 2026" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# STEP 1 - Prerequisites
Write-Host "[STEP 1] Checking prerequisites..." -ForegroundColor Blue
try { $n = node -v; Write-Host "OK: Node.js $n" -ForegroundColor Green }
catch { Write-Host "ERROR: Node.js not found. Get it from https://nodejs.org" -ForegroundColor Red; exit 1 }
try { $n = npm -v; Write-Host "OK: npm $n" -ForegroundColor Green }
catch { Write-Host "ERROR: npm not found" -ForegroundColor Red; exit 1 }

# STEP 2 - Install dependencies
Write-Host ""
Write-Host "[STEP 2] Installing dependencies..." -ForegroundColor Blue
npm install
npm install sharp --save-dev --silent
Write-Host "OK: Dependencies installed" -ForegroundColor Green

# STEP 3 - Environment variables
Write-Host ""
Write-Host "[STEP 3] Setting up .env.local..." -ForegroundColor Blue
if (-Not (Test-Path ".env.local")) {
    Copy-Item ".env.example" ".env.local"
    Write-Host "OK: .env.local created" -ForegroundColor Green
} else {
    Write-Host "SKIP: .env.local already exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Fill in .env.local with these credentials:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. SUPABASE (https://supabase.com)" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Gray
Write-Host "   SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "2. MAPBOX (https://mapbox.com)" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_MAPBOX_TOKEN" -ForegroundColor Gray
Write-Host ""
Write-Host "3. TWILIO (https://twilio.com)" -ForegroundColor White
Write-Host "   TWILIO_ACCOUNT_SID" -ForegroundColor Gray
Write-Host "   TWILIO_AUTH_TOKEN" -ForegroundColor Gray
Write-Host "   TWILIO_PHONE_NUMBER" -ForegroundColor Gray
Write-Host "   TWILIO_WHATSAPP_NUMBER" -ForegroundColor Gray
Write-Host ""
Write-Host "4. ANTHROPIC (https://console.anthropic.com)" -ForegroundColor White
Write-Host "   ANTHROPIC_API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "5. NOVUS.AI - REQUIRED FOR HACKATHON (https://novus.ai)" -ForegroundColor Red
Write-Host "   NEXT_PUBLIC_NOVUS_PROJECT_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "6. VAPID KEYS (https://vapidkeys.com)" -ForegroundColor White
Write-Host "   NEXT_PUBLIC_VAPID_PUBLIC_KEY" -ForegroundColor Gray
Write-Host "   VAPID_PRIVATE_KEY" -ForegroundColor Gray
Write-Host "   VAPID_SUBJECT (mailto:your@email.com)" -ForegroundColor Gray
Write-Host ""

Write-Host "Opening .env.local in Notepad..." -ForegroundColor Cyan
Start-Process notepad ".env.local" -Wait
Write-Host "OK: .env.local saved" -ForegroundColor Green

# STEP 4 - Generate encryption key
Write-Host ""
Write-Host "[STEP 4] Generating encryption key..." -ForegroundColor Blue
$encKey = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
$envContent = Get-Content ".env.local" -Raw
if ($envContent -match "your_64_char_hex_key") {
    $envContent = $envContent -replace "your_64_char_hex_key", $encKey
    Set-Content ".env.local" $envContent -NoNewline
    Write-Host "OK: Encryption key generated" -ForegroundColor Green
} else {
    Write-Host "SKIP: Encryption key already set" -ForegroundColor Yellow
}

# STEP 5 - App URL
Write-Host ""
Write-Host "[STEP 5] App URL setup..." -ForegroundColor Blue
Write-Host "Enter your Vercel URL after deploying (e.g. https://shieldher.vercel.app)"
Write-Host "Press ENTER to skip for now and use localhost"
$appUrl = Read-Host "Your app URL"
if ($appUrl -ne "") {
    $envContent = Get-Content ".env.local" -Raw
    $envContent = $envContent -replace "http://localhost:3000", $appUrl
    Set-Content ".env.local" $envContent -NoNewline
    Write-Host "OK: App URL set to $appUrl" -ForegroundColor Green
} else {
    Write-Host "SKIP: Using localhost - update later before submitting" -ForegroundColor Yellow
}

# STEP 6 - Generate icons
Write-Host ""
Write-Host "[STEP 6] Generating PWA icons..." -ForegroundColor Blue
node scripts/generate-icons.js
Write-Host "OK: Icons generated in public/icons/" -ForegroundColor Green

# STEP 7 - Sounds info
Write-Host ""
Write-Host "[STEP 7] Ambient sounds for fake call..." -ForegroundColor Blue
Write-Host ""
Write-Host "Download these 4 MP3 files into public\sounds\" -ForegroundColor Yellow
Write-Host "Source: https://freesound.org or https://pixabay.com/sound-effects" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ambient-office.mp3  (search: office ambience)" -ForegroundColor Gray
Write-Host "  ambient-cafe.mp3    (search: cafe ambience)" -ForegroundColor Gray
Write-Host "  ambient-street.mp3  (search: street ambience)" -ForegroundColor Gray
Write-Host "  ambient-home.mp3    (search: home ambience)" -ForegroundColor Gray
Write-Host ""
Write-Host "Fake call works without these - just no background audio" -ForegroundColor Yellow

# STEP 8 - Supabase migrations
Write-Host ""
Write-Host "[STEP 8] Supabase database setup..." -ForegroundColor Blue
Write-Host ""
Write-Host "Go to https://supabase.com/dashboard -> SQL Editor" -ForegroundColor Cyan
Write-Host "Run these 3 files IN ORDER:" -ForegroundColor White
Write-Host ""
Write-Host "  File 1: supabase\migrations\001_initial_schema.sql" -ForegroundColor Gray
Write-Host "  File 2: supabase\migrations\002_seed_emergency_numbers.sql" -ForegroundColor Gray
Write-Host "  File 3: supabase\migrations\003_push_and_tokens.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "Then enable Realtime for:" -ForegroundColor White
Write-Host "  location_pings, sos_alerts, journeys, check_ins" -ForegroundColor Gray
Write-Host ""

Write-Host "Opening migrations folder..." -ForegroundColor Cyan
Start-Process explorer "supabase\migrations"

Read-Host "Press ENTER once all 3 migrations are done"
Write-Host "OK: Migrations confirmed" -ForegroundColor Green

# STEP 9 - Edge functions
Write-Host ""
Write-Host "[STEP 9] Supabase Edge Functions..." -ForegroundColor Blue
Write-Host ""
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if ($supabaseCmd) {
    $projectRef = Read-Host "Enter your Supabase project ref (from dashboard URL, e.g. abcdefgh)"
    if ($projectRef -ne "") {
        supabase link --project-ref $projectRef 2>$null
        supabase functions deploy check-in-monitor
        supabase functions deploy sos-escalation
        Write-Host "OK: Edge functions deployed" -ForegroundColor Green
        Write-Host ""
        Write-Host "Schedule check-in-monitor in Supabase dashboard:" -ForegroundColor Yellow
        Write-Host "  Dashboard -> Edge Functions -> check-in-monitor -> Schedule" -ForegroundColor Gray
        Write-Host "  Cron: * * * * *" -ForegroundColor Gray
    }
} else {
    Write-Host "Supabase CLI not found. Install it after setup:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor Cyan
    Write-Host "  supabase link --project-ref YOUR_REF" -ForegroundColor Gray
    Write-Host "  supabase functions deploy check-in-monitor" -ForegroundColor Gray
    Write-Host "  supabase functions deploy sos-escalation" -ForegroundColor Gray
}

# STEP 10 - Build test
Write-Host ""
Write-Host "[STEP 10] Testing build..." -ForegroundColor Blue
Write-Host ""
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Build passed!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Build errors above - fix before deploying" -ForegroundColor Yellow
    Write-Host "Common fix: check all .env.local keys are filled in" -ForegroundColor Gray
}

# STEP 11 - Vercel deploy
Write-Host ""
Write-Host "[STEP 11] Deploy to Vercel..." -ForegroundColor Blue
Write-Host ""
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (-Not $vercelCmd) {
    Write-Host "Installing Vercel CLI..." -ForegroundColor Cyan
    npm install -g vercel
}
$deployNow = Read-Host "Deploy to Vercel now? (y/n)"
if ($deployNow -eq "y" -or $deployNow -eq "Y") {
    vercel --prod
    Write-Host ""
    Write-Host "IMPORTANT: Add all .env.local variables to Vercel:" -ForegroundColor Yellow
    Write-Host "  Vercel Dashboard -> Project -> Settings -> Environment Variables" -ForegroundColor Cyan
    Write-Host "  Copy every key from .env.local into Vercel" -ForegroundColor Gray
} else {
    Write-Host "Run 'vercel' when ready" -ForegroundColor Gray
}

# STEP 12 - Novus verification
Write-Host ""
Write-Host "[STEP 12] Novus.ai verification..." -ForegroundColor Blue
Write-Host ""
Write-Host "1. Open your deployed app URL" -ForegroundColor White
Write-Host "2. Sign up and complete onboarding" -ForegroundColor White
Write-Host "3. Go to https://novus.ai -> your project dashboard" -ForegroundColor White
Write-Host "4. You should see events: page_view, onboarding_completed" -ForegroundColor White
Write-Host "5. SCREENSHOT the dashboard - required for submission!" -ForegroundColor Red
Write-Host ""
Read-Host "Press ENTER once Novus is verified"
Write-Host "OK: Novus.ai verified" -ForegroundColor Green

# DONE
Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "   ShieldHer is LIVE. Go win. 🛡️" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Submission checklist (before June 20 5PM GMT):" -ForegroundColor White
Write-Host ""
Write-Host "  [ ] Public URL live and working" -ForegroundColor Gray
Write-Host "  [ ] Novus.ai dashboard screenshot saved" -ForegroundColor Gray
Write-Host "  [ ] 20+ real users (share with friends/family NOW)" -ForegroundColor Gray
Write-Host "  [ ] 2-3 min demo video recorded:" -ForegroundColor Gray
Write-Host "        0:00 Problem statement" -ForegroundColor DarkGray
Write-Host "        0:20 Dashboard overview" -ForegroundColor DarkGray
Write-Host "        0:35 Hold SOS -> show SMS received by contact" -ForegroundColor DarkGray
Write-Host "        1:00 Contact tracking page (live map)" -ForegroundColor DarkGray
Write-Host "        1:20 Journey mode start" -ForegroundColor DarkGray
Write-Host "        1:35 Fake call ringing" -ForegroundColor DarkGray
Write-Host "        1:50 AI companion - type 'I'm being followed'" -ForegroundColor DarkGray
Write-Host "        2:10 Journal + safety map" -ForegroundColor DarkGray
Write-Host "        2:30 Novus dashboard with real data" -ForegroundColor DarkGray
Write-Host "  [ ] Submit at Devpost before June 20, 5PM GMT" -ForegroundColor Gray
Write-Host ""
Write-Host "You've got this Tony. Go win." -ForegroundColor Green
Write-Host ""
