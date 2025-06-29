# Supabase Setup Guide untuk PocketBizz

## Setup Supabase Database & Authentication

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login ke account
3. Click "New Project"
4. Pilih organization dan enter project details:
   - **Name**: PocketBizz-Production
   - **Database Password**: [Create strong password]
   - **Region**: Southeast Asia (Singapore) - closest to Malaysia

### Step 2: Get Database Connection String
1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string**
3. Copy **URI** connection string:
   ```
   postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with your actual database password

### Step 3: Get Authentication Keys
1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 4: Add Secrets to Replit
In Replit Secrets tab, add these 3 secrets:

```
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 5: Create Database Tables
Supabase akan automatically create tables dari SQLAlchemy models. Kalau tidak, run SQL commands ini dalam Supabase SQL Editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Business tables will be created automatically by SQLAlchemy
-- Authentication tables will be handled by Supabase Auth
```

### Step 6: Configure Authentication
1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Configure **Site URL**: `https://your-replit-domain.replit.app`
3. Add **Redirect URLs**:
   - `https://your-replit-domain.replit.app/auth/callback`
   - `https://your-replit-domain.replit.app/`

### Step 7: Test Setup
1. Restart Replit app
2. Check logs untuk confirmation:
   - `✅ Supabase client initialized successfully`
   - `✅ Database connected successfully`
3. Try register new account
4. Try login/logout

## Features Enabled After Setup
- ✅ **Real User Authentication** (instead of demo mode)
- ✅ **Production Database** (PostgreSQL dengan connection pooling)
- ✅ **User Registration/Login** (dengan email verification)
- ✅ **Password Reset** (automatic email sending)
- ✅ **Secure Sessions** (JWT tokens)
- ✅ **Multi-user Support** (setiap user ada data sendiri)

## Troubleshooting
- **Connection Error**: Check DATABASE_URL format dan password
- **Auth Error**: Verify SUPABASE_URL dan SUPABASE_ANON_KEY
- **Redirect Error**: Add proper redirect URLs dalam Auth settings