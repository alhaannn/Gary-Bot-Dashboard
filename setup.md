# Ultimate GaryBot Dashboard Setup Guide

This guide walks you through perfectly linking your GaryBot Python engine to the Next.js Analytics Dashboard, hosted natively as a Telegram Mini-App!

---

## 🟢 Step 1: Database Setup (Supabase)
GaryBot needs a place to push real-time trade signals so your dashboard can read them remotely. We use **Supabase**, an enterprise-grade but completely free PostgreSQL database.

1. **Create an account:** Go to [Supabase](https://supabase.com/) and sign up.
2. **Create a Project:** Click "New Project", give it a name like `GaryBot-Database`, and generate a strong password. Wait a few minutes for the database to boot.
3. **Run the Database Schema:** 
   - On your Supabase dashboard, click the **SQL Editor** on the left menu.
   - Click "New Query" and paste exactly this code into the editor:
     ```sql
     CREATE TABLE trades (
         id TEXT PRIMARY KEY,
         pair TEXT NOT NULL,
         action TEXT NOT NULL,
         entry_price FLOAT,
         sl FLOAT,
         tp FLOAT,
         status TEXT NOT NULL,
         pnl FLOAT DEFAULT 0.0,
         channel TEXT,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     );
     ```
   - Hit **Run** (Cmd/Ctrl + Enter). Your database is now mapped and ready to receive trades!
4. **Acquire your Keys:**
   - Go to **Project Settings** (the gear icon) -> **API**.
   - Copy your `Project URL` and your `anon public` key. You will need these for the next steps!

---

## 🟢 Step 2: Hosting the Dashboard (GitHub & Vercel)
You need to put your dashboard on the internet so Telegram can open it inside a webviewer frame via a native URL.

1. **Push to GitHub:** Make sure you have pushed this entire `dashboard` folder up to a public or private GitHub repository.
2. **Create a Vercel Account:** Go to [Vercel](https://vercel.com/) and sign up with your GitHub account.
3. **Import Project:** Click "Add New..." -> "Project". Select your `Gary-Bot-Dashboard` repository from the GitHub list.
4. **Set Environment Variables:** Before you click "Deploy", open the **Environment Variables** dropdown menu and add these 3 variables exactly:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   NEXT_PUBLIC_STARTING_BALANCE=2500
   ```
   *(Note: You can easily change your account's tracked simulated capital every month by adjusting `NEXT_PUBLIC_STARTING_BALANCE`)*.
5. **Hit Deploy!** Wait about a minute. Vercel will give you a live domain URL at the end (e.g., `https://your-dashboard.vercel.app`). Copy this URL.

---

## 🟢 Step 3: Telegram Bot Setup (BotFather)
To broadcast the Dashboard inside a Telegram App, GaryBot needs an official Telegram Bot token.

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow the prompts to name it (e.g., "GaryBot Analytics").
3. **Copy the Bot Token** that BotFather gives you.
4. Go to `@userinfobot` or `@RawDataBot` on Telegram to get your numeric personal **Chat ID** (so the bot knows to message *you* privately).

---

## 🟢 Step 4: Connect GaryBot (The Python Backend)
Now we must tell GaryBot to physically push signals to the database, and link the Telegram buttons to your Vercel app.

1. Open your main GaryBot source code directory on your server or PC.
2. Open `config.py` in your text editor.
3. Paste the Telegram credentials:
   ```python
   TELEGRAM_BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
   TELEGRAM_CHAT_ID = "123456789"
   ```
4. Set your Supabase keys so the Python code can push data:
   ```python
   SUPABASE_URL = "https://your-project-id.supabase.co"
   SUPABASE_KEY = "your_supabase_anon_key_here"
   ```
5. Find the `DASHBOARD_URL` variable, and paste the Vercel URL you copied from Step 2:
   ```python
   DASHBOARD_URL = "https://your-dashboard.vercel.app"
   ```

---

## 🟢 Step 5: Validate Your Integration
You are completely finished! Next time GaryBot receives an ENTRY signal via the channel listener:
1. It executes the trade directly on MT5 natively.
2. It pushes the trade ledger silently to your Supabase cloud.
3. It sends an HTML alert privately to your Telegram Bot.
4. Attached dynamically to that alert is an embedded "Open Dashboard" button.
5. Tapping it will pop open the Vercel app directly inside Telegram's native Mini-App frame, pull the ledger, and visualize your entire PnL natively!