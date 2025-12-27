# MVP Cricket Platform - Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account and project created
- (Optional) Stripe account for payments
- (Optional) Resend account for emails
- (Optional) Play-Cricket API token

## Phase 1: Database Setup

### 1. Run Migrations on Supabase

You have two options:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref alhryjjjeixlvjfsrntm

# Push migrations to production
supabase db push
```

#### Option B: Manual SQL Execution

1. Go to your Supabase dashboard: https://app.supabase.com/project/alhryjjjeixlvjfsrntm
2. Navigate to SQL Editor
3. Run each migration file in order:
   - `supabase/migrations/001_core_tables.sql`
   - `supabase/migrations/002_availability_selection.sql`
   - `supabase/migrations/003_payments.sql`
   - `supabase/migrations/004_mega_stats.sql`
   - `supabase/migrations/005_rls_policies.sql`
   - `supabase/migrations/006_functions_triggers.sql`

### 2. Configure Supabase Auth

In your Supabase dashboard:

1. **Navigate to:** Authentication → URL Configuration
2. **Site URL:** Set to your production domain (or `http://localhost:3000` for dev)
3. **Redirect URLs:** Add:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)

4. **Navigate to:** Authentication → Email Templates
5. Customize the email templates (optional):
   - Confirm signup
   - Magic Link
   - Reset Password
   - Invite user

## Phase 2: Environment Configuration

### 1. Get Your Supabase Keys

From Supabase Dashboard → Settings → API:
- **URL:** Already set to `https://alhryjjjeixlvjfsrntm.supabase.co`
- **Anon Public Key:** Already configured
- **Service Role Key:** Copy this (keep it secret!)

### 2. Update Environment Variables

Copy the example file:

```bash
cd apps/web
cp .env.example .env.local
```

Edit `.env.local`:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://alhryjjjeixlvjfsrntm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Play-Cricket API (Optional - if you have it)
PC_API_TOKEN=your_play_cricket_api_token

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Phase 3: Install Dependencies & Run

```bash
# From project root
npm install

# Start development server
npm run dev

# The app will be available at:
# - Web app: http://localhost:3000
# - Docs: http://localhost:3001
```

## Phase 4: Deploy Edge Functions (When Stripe/Resend Ready)

### 1. Set Edge Function Secrets

```bash
# Stripe secrets (when ready)
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set STRIPE_PRICE_PRO_MONTHLY=price_xxx
supabase secrets set STRIPE_PRICE_PRO_ANNUAL=price_xxx
supabase secrets set STRIPE_PRICE_PREMIER_MONTHLY=price_xxx
supabase secrets set STRIPE_PRICE_PREMIER_ANNUAL=price_xxx

# Resend secrets (when ready)
supabase secrets set RESEND_API_KEY=re_xxxxx

# Play-Cricket
supabase secrets set PC_API_TOKEN=your_token

# Supabase (for edge functions)
supabase secrets set SUPABASE_URL=https://alhryjjjeixlvjfsrntm.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Deploy Functions

```bash
# Deploy all functions
supabase functions deploy stripe-webhook
supabase functions deploy send-email
supabase functions deploy pc-sync
```

## Testing the Auth Flow

### 1. Register a New Club

1. Navigate to http://localhost:3000/register
2. Fill in:
   - Club Name: "Test Cricket Club"
   - Your Name: "Test Admin"
   - Email: your-email@example.com
   - Password: at least 8 characters
   - Play-Cricket Site ID: (optional)
3. Click "Create Club"
4. You'll be redirected to check email page

### 2. Verify Email

1. Check your email inbox
2. Click the verification link
3. You'll be redirected to the dashboard

### 3. Verify Database

In Supabase Dashboard → Table Editor:
- Check `organizations` table - should have 1 row (your club)
- Check `profiles` table - should have 1 row (you as admin)

## Phase 5: Production Deployment

### Option 1: Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd apps/web
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXT_PUBLIC_APP_URL (your production domain)
```

### Option 2: Other Platforms

The app can deploy to:
- Netlify
- Railway
- Fly.io
- AWS Amplify
- Any platform supporting Next.js 15+

Just ensure environment variables are set correctly.

## Next Steps

### Immediate (Free Tier)
- ✅ Authentication working
- ✅ Organization/Club created
- ✅ User profiles managed
- 🔲 Add team members via invites
- 🔲 Create matches
- 🔲 Track basic stats

### When You Add Stripe
- Set up Stripe products for Pro/Premier tiers
- Deploy stripe-webhook edge function
- Enable subscription management
- Enable payment features

### When You Add Resend
- Set up Resend domain
- Deploy send-email edge function
- Enable availability polling emails
- Enable team selection notifications

### Feature Rollout Phases
- **Phase 8 (COMPLETE):** Auth & Subscriptions
- **Phase 9:** Invites & Onboarding
- **Phase 10:** Availability & Selection
- **Phase 11:** Club Payments
- **Phase 12:** Mega Stats & Analytics

## Troubleshooting

### "Invalid JWT" errors
- Check that your Supabase keys are correct in `.env.local`
- Make sure you're using the anon key, not the service role key for client-side

### Email verification not working
- Check Supabase Auth → URL Configuration
- Ensure redirect URLs include your callback route
- Check spam folder for verification emails

### Database errors
- Verify all migrations ran successfully
- Check RLS policies are enabled
- Check user has permissions

### TypeScript errors
- Run `npm run check-types` to verify
- May need to restart your IDE

## Support

For issues or questions:
1. Check the implementation guide in the root directory
2. Review Supabase documentation: https://supabase.com/docs
3. Check Next.js documentation: https://nextjs.org/docs

## Security Checklist

- ✅ RLS (Row Level Security) enabled on all tables
- ✅ Service role key kept secret (server-side only)
- ✅ HTTPS in production (via Vercel/hosting platform)
- ⚠️ Update Supabase Auth email templates before production
- ⚠️ Set up proper CORS for Edge Functions
- ⚠️ Enable 2FA on Supabase account
