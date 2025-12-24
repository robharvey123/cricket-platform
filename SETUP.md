# Brookweald Cricket Platform - Setup Guide

## Quick Start

### 1. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the migrations in order:

   a) **Foundation Migration**:
   - Copy contents of `supabase/migrations/20241224_multi_tenant_foundation.sql`
   - Paste and click **Run**

   b) **Player Statistics Migration**:
   - Copy contents of `supabase/migrations/20241225_player_statistics.sql`
   - Paste and click **Run**

4. Run the seed data:
   - Copy contents of `supabase/complete-seed.sql`
   - Paste and click **Run**

This will create:
- ✅ Brookweald Cricket Club
- ✅ Two teams (1st XI, 2nd XI)
- ✅ 2025 Season
- ✅ Default scoring configuration
- ✅ 11 sample players linked to 1st XI

### 2. Link Your User Account

After signing up in the app, link yourself to Brookweald CC:

```sql
-- Replace YOUR_EMAIL@example.com with your actual email
INSERT INTO public.user_org_roles (user_id, club_id, role)
SELECT
  auth.users.id,
  clubs.id,
  'org_admin'
FROM auth.users
CROSS JOIN public.clubs
WHERE auth.users.email = 'YOUR_EMAIL@example.com'
  AND clubs.slug = 'brookweald';
```

### 3. Start the App

```bash
cd apps/web
npm run dev
```

Visit: `http://localhost:3000`

## What's Included

### Database Structure
- **Multi-tenant** with Row Level Security (RLS)
- **Clubs**: Organizations (Brookweald CC)
- **Teams**: 1st XI, 2nd XI
- **Seasons**: 2025 Season (Apr 1 - Sep 30)
- **Players**: 11 sample players
- **Scoring**: Configurable points system

### Features Available

1. **PDF Import** (`/admin/matches/import-pdf`)
   - Upload cricket scorecards as PDF
   - AI extracts match data
   - Preview and edit before importing
   - Validation warnings and errors

2. **Match List** (`/admin/matches`)
   - View all imported matches
   - Click to see full scorecard

3. **Match Detail** (`/admin/matches/[id]`)
   - Full scorecard display
   - Batting and bowling cards
   - Innings summaries

4. **Scoring Configuration** (`/admin/scoring`)
   - Customize points formulas
   - Form view and JSON view
   - Live preview
   - Recalculate all points

## Phases Completed

- ✅ **Phase 0**: Multi-tenant foundation
- ✅ **Phase 2**: Scoring engine
- ✅ **Phase 3**: PDF parsing & validation UX
- ✅ **Match Detail**: Full scorecard display

## Next Steps

To import your first match:

1. Go to `/admin/matches/import-pdf`
2. Upload a PDF scorecard
3. Review the AI-extracted data
4. Edit any fields if needed
5. Click "Import Match"
6. View the match in the matches list

## Troubleshooting

### "No club found for user"
- Make sure you ran Step 2 to link your user to Brookweald CC
- Check your email matches the one you used to sign up

### "Please create a season first"
- Run the complete-seed.sql file
- Check that the 2025 Season exists in your database

### "Please create a team first"
- Run the complete-seed.sql file
- Check that teams exist in your database

### No matches showing
- Import a match first using the PDF import feature
- Check that the match was imported successfully

## Database Schema

See `supabase/README.md` for full schema documentation.

## Support

- GitHub Issues: https://github.com/robharvey123/cricket-platform/issues
- Documentation: See README files in each directory
