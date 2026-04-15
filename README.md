# GaryBot Analytics Dashboard (Telegram Mini App)

A beautifully designed, real-time Telegram Mini App dashboard specifically built for the GaryBot trading engine.

## Overview
This project is a Next.js 14 App Router application that operates entirely independently from the main GaryBot engine. It connects directly to the Supabase telemetry database that GaryBot pushes to, securely pulling live PnL, Win Rates, and trade execution data in real-time.

It features:
- **Performance Calendar:** Automatically groups closures by specific calendar days evaluated natively in strictly Indian Standard Time (IST).
- **Compounding Equity Curve:** Calculates your total account balance incrementally from a customizable base capital tracking per month.
- **Trader Isolation:** Filter metrics to view combined analytics or isolate specifically to a single Telegram channel monitor (e.g. `Gary_TheTrader` vs `goldtradersunny`).
- **Telegram Mini-App Optimization:** Designed inside a completely responsive framer-motion wrapper to look absolutely perfect operating within the Telegram chat interface on your phone.

## Setup & Deployment

1. **Supabase Setup:** Make sure GaryBot is correctly feeding data into your Supabase `trades` project.
2. **Environment Configuration:** Configure Vercel environment variables directly using the instructions laid out in `setup.md`. You'll need three keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   NEXT_PUBLIC_STARTING_BALANCE=2500
   ```
   *(Note: You can easily change your account's tracked starting balance every month by simply adjusting `NEXT_PUBLIC_STARTING_BALANCE`).*

3. **Deploying to Vercel:**
   Push this sub-repository to its own GitHub and import it on Vercel. 
   - Framework Preset: Next.js
   - Run Command: `npm run build`

4. **Connecting back to GaryBot:**
   Once Vercel issues your live deployment link (e.g., `https://garybot-dash.vercel.app`), open the main Python backend for GaryBot, edit `config.py` and set the variable to `DASHBOARD_URL = "https://garybot-dash.vercel.app"`. GaryBot will now dynamically attach this directly into all Telegram Signal alerts it sends!
