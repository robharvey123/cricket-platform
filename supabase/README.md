# Supabase Setup Guide

## 1. Create New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization: Your account
4. Project name: `cricket-platform` (or `brookweald-cc-mvp`)
5. Database password: **Save this securely!**
6. Region: Choose closest to you (e.g., `eu-west-2` for UK)
7. Plan: Free tier is fine for MVP
8. Click "Create new project"

## 2. Run Database Migrations

Once your project is created:

### Option A: Using Supabase Dashboard (Recommended for MVP)

1. Go to your project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the contents of `supabase/migrations/20251213000001_initial_schema.sql`
5. Paste into the SQL editor
6. Click "Run" button
7. Repeat for `supabase/migrations/20251213000002_rls_policies.sql`
8. Repeat for `supabase/seed.sql`

### Option B: Using Supabase CLI (For production)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Run seeds
supabase db reset --db-url "your-database-url"
```

## 3. Get Your API Keys

1. In Supabase Dashboard, go to "Settings" → "API"
2. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Starts with `eyJhbG...`
   - **service_role key**: Starts with `eyJhbG...` (keep this secret!)

## 4. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

3. Add Play-Cricket API credentials (if you have them):
   ```bash
   PLAY_CRICKET_API_TOKEN=your_api_token
   PLAY_CRICKET_SITE_ID=your_site_id
   ```

## 5. Verify Setup

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. You should see the app running at `http://localhost:3000`

## 6. Create Test User

1. In Supabase Dashboard, go to "Authentication" → "Users"
2. Click "Add user" → "Create new user"
3. Email: `admin@brookwealdcc.test`
4. Password: Create a strong password
5. Click "Create user"

6. Now manually add this user to the `user_org_roles` table:
   - Go to "Table Editor" → "user_org_roles"
   - Click "Insert" → "Insert row"
   - `user_id`: Select the user you just created
   - `club_id`: `a0000000-0000-0000-0000-000000000001` (Brookweald CC)
   - `role`: `org_admin`
   - Click "Save"

7. You can now sign in with this user at `/auth/signin`

## Database Schema Overview

The schema includes:

### Core Tables
- `clubs` - Organizations (Brookweald CC is seeded)
- `user_org_roles` - Multi-tenant access control
- `seasons` - Cricket seasons (2025 is seeded)
- `teams` - Teams per season (1st XI is seeded)
- `players` - Player roster (11 sample players seeded)
- `team_players` - Squad membership

### Match Data
- `matches` - Match records
- `innings` - Innings per match
- `batting_cards` - Batting performance per innings
- `bowling_cards` - Bowling performance per innings
- `fielding_cards` - Fielding performance per match

### Scoring System
- `scoring_configs` - Admin-configurable scoring rules (Brookweald 2025 rules seeded)
- `points_events` - Atomic points per player per match
- `audit_logs` - Audit trail for all important actions

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- Multi-tenant data isolation (users can only see their club's data)
- Role-based access (org_admin vs member)
- Public leaderboard access (when enabled)

## Troubleshooting

### "relation does not exist" error
- Make sure you ran all migration files in order
- Check the "SQL Editor" → "History" to see if migrations succeeded

### "permission denied" error
- Check RLS policies are enabled
- Verify user has a row in `user_org_roles` table
- Check the user's `club_id` matches the data you're trying to access

### Auth not working
- Verify `.env.local` has correct Supabase URL and keys
- Check middleware is configured (should be in `apps/web/middleware.ts`)
- Restart dev server after changing environment variables

## Next Steps

Once setup is complete:
1. Sign in at `/auth/signin`
2. Navigate to `/admin/players` to manage players
3. Import a match from Play-Cricket
4. View leaderboard at `/admin/leaderboard`
