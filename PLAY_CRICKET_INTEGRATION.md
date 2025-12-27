# Play Cricket API Integration

Complete implementation of Play Cricket API integration for importing match data and scorecards.

## Overview

This integration allows cricket clubs to automatically import match data from Play Cricket using their Site ID and API token. Matches are imported with full scorecard details including batting, bowling, and fielding statistics.

## Your API Token

```
API Token: 1983549cad0ea2471434f8810dba7009
```

**Keep this secure!** Store it in your environment variables or a secure vault in production.

## Setup Instructions

### 1. Apply Database Migration

First, ensure Docker is running, then apply the migration:

```bash
npx supabase db reset
```

Or if you're using a remote Supabase instance:

```bash
npx supabase db push
```

This migration adds:
- Play Cricket configuration fields to the `clubs` table
- `play_cricket_sync_logs` table for tracking imports
- `play_cricket_player_mappings` table for player matching
- Helper function `get_or_create_play_cricket_player` for automatic player creation/matching

### 2. Configure Your Club

1. Navigate to `/admin/settings` in your app
2. Click on "Play Cricket Import" under "Match Management"
3. Enter your Site ID (find this in your Play Cricket club URL)
4. Enter the API token above
5. Click "Test Connection"

### 3. Import Matches

Once configured:

1. Select a season year (defaults to current year)
2. Optionally set a date range to limit matches
3. Click "Import Matches"
4. Wait for the import to complete (may take a few minutes for full seasons)

## Features

### ✅ Implemented (MVP)

- **Configuration Management**
  - Store Site ID and API token securely
  - Test connection to Play Cricket API
  - View connection status and last sync time

- **Manual Import**
  - Import all matches for a specific season
  - Filter by date range
  - Full scorecard import (innings, batting, bowling)
  - Automatic player matching and creation

- **Player Matching**
  - Automatic player matching by name
  - Creation of new players if not found
  - Stores Play Cricket player IDs for future matching
  - Uses helper function for efficient matching

- **Import History**
  - View past import logs
  - See matches found, imported, updated, and skipped
  - Error tracking for failed imports

- **Data Integrity**
  - Prevents duplicate imports (checks external_ids)
  - Transaction-based imports
  - Automatic season creation if needed
  - Automatic team creation if needed

### 🚧 Future Enhancements

- **Player Conflict Resolution UI**
  - Manually map Play Cricket players to existing players
  - Merge duplicate players
  - Confidence scoring for auto-matches

- **Scheduled Auto-Sync**
  - Cron job for automatic weekly imports
  - Background processing
  - Email notifications on completion

- **Advanced Features**
  - Date range filtering in UI
  - Bulk season import
  - Re-import/update existing matches
  - Webhooks for real-time updates

## How It Works

### 1. Data Flow

```
Play Cricket API → Service Layer → API Routes → Database → UI
```

### 2. Import Process

1. Fetch matches from Play Cricket Result Summary API
2. For each match:
   - Check if already exists (by `external_ids.play_cricket_id`)
   - If exists: skip (or update in future enhancement)
   - If new: fetch full match detail
3. Create/find season and team
4. Create match record with source='play_cricket'
5. For each innings:
   - Create innings record
   - Import batting cards (with player matching)
   - Import bowling cards (with player matching)
6. Log success/errors to sync_logs table

### 3. Player Matching

The `get_or_create_play_cricket_player` function:

1. Checks if Play Cricket player ID is already mapped
2. If not, tries to match by full name
3. If no match, creates new player
4. Stores/updates mapping for future imports
5. Returns player ID for use in batting/bowling cards

## API Endpoints

### POST `/api/play-cricket/test-connection`

Tests connection to Play Cricket API and saves credentials.

**Request:**
```json
{
  "siteId": "1234",
  "apiToken": "your-token",
  "clubId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connection successful"
}
```

### POST `/api/play-cricket/import`

Imports matches for a specific season.

**Request:**
```json
{
  "clubId": "uuid",
  "season": 2024,
  "fromDate": "2024-01-01",  // optional
  "toDate": "2024-12-31"      // optional
}
```

**Response:**
```json
{
  "success": true,
  "syncLogId": "uuid",
  "matchesFound": 25,
  "matchesImported": 20,
  "matchesUpdated": 0,
  "matchesSkipped": 5,
  "errors": []
}
```

### GET `/api/play-cricket/sync-logs?clubId=uuid`

Fetches import history for a club.

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "sync_type": "manual",
      "season_year": 2024,
      "status": "completed",
      "matches_found": 25,
      "matches_imported": 20,
      "matches_skipped": 5,
      "errors": [],
      "started_at": "2024-01-15T10:00:00Z",
      "completed_at": "2024-01-15T10:05:00Z"
    }
  ]
}
```

## Database Schema

### clubs (new columns)

```sql
play_cricket_site_id TEXT
play_cricket_api_token TEXT  -- encrypt in production
play_cricket_sync_enabled BOOLEAN DEFAULT FALSE
play_cricket_last_sync TIMESTAMPTZ
```

### play_cricket_sync_logs

```sql
id UUID PRIMARY KEY
club_id UUID NOT NULL
sync_type TEXT NOT NULL  -- 'manual', 'scheduled', 'initial'
season_year INT NOT NULL
status TEXT NOT NULL  -- 'pending', 'in_progress', 'completed', 'failed'
matches_found INT DEFAULT 0
matches_imported INT DEFAULT 0
matches_updated INT DEFAULT 0
matches_skipped INT DEFAULT 0
errors JSONB DEFAULT '[]'
metadata JSONB DEFAULT '{}'
started_at TIMESTAMPTZ DEFAULT NOW()
completed_at TIMESTAMPTZ
created_by UUID
```

### play_cricket_player_mappings

```sql
id UUID PRIMARY KEY
club_id UUID NOT NULL
play_cricket_player_id INT NOT NULL
play_cricket_player_name TEXT NOT NULL
player_id UUID
mapping_status TEXT DEFAULT 'pending'  -- 'pending', 'mapped', 'ignored'
confidence_score NUMERIC(3,2)
UNIQUE(club_id, play_cricket_player_id)
```

## Play Cricket API Reference

### Base URL
```
https://play-cricket.com/api/v2
```

### Endpoints Used

1. **Match Summary**
   ```
   GET /matches.json?site_id={id}&season={year}&api_token={token}
   ```

2. **Result Summary**
   ```
   GET /result_summary.json?site_id={id}&season={year}&api_token={token}
   ```

3. **Match Detail**
   ```
   GET /match_detail.json?match_id={id}&api_token={token}
   ```

## Troubleshooting

### Connection Test Fails

- Verify Site ID is correct (check Play Cricket URL)
- Ensure API token is valid
- Check that ECB has issued token for your club
- Try manually visiting: `https://play-cricket.com/api/v2/matches.json?site_id=YOUR_ID&season=2024&api_token=YOUR_TOKEN`

### Import Completes But No Matches

- Verify season year is correct
- Check date range isn't too restrictive
- Ensure matches exist on Play Cricket for that period
- Review sync logs for errors

### Players Not Matching

- Check player names match exactly between systems
- Use upcoming Player Conflict Resolution UI to manually map
- Review `play_cricket_player_mappings` table

### Performance Issues

- Large season imports may take 5-10 minutes
- Consider implementing background jobs for production
- Add pagination for very large datasets

## Security Considerations

### Current Implementation

- API token stored in database (plaintext)
- Only admins can access integration
- Connection tested before saving credentials

### Production Recommendations

1. **Encrypt API Token**
   ```typescript
   import { createCipheriv, createDecipheriv } from 'crypto'
   // Encrypt before storing, decrypt when using
   ```

2. **Environment Variables**
   ```env
   PLAY_CRICKET_ENCRYPTION_KEY=your-secret-key
   ```

3. **Rate Limiting**
   - Implement rate limiting on API routes
   - Add exponential backoff for Play Cricket API calls

4. **Audit Logging**
   - Log all API credential changes
   - Track who initiated imports

## Next Steps

1. ✅ Run database migration
2. ✅ Configure your club with Site ID and API token
3. ✅ Test import with a single season
4. ⏳ Build Player Conflict Resolution UI
5. ⏳ Implement scheduled auto-sync
6. ⏳ Add match update/re-import functionality

## Support

For Play Cricket API issues:
- Email: support@ecb.co.uk
- Docs: https://play-cricket.ecb.co.uk/hc/en-us

For Cricket MVP issues:
- Check sync logs for detailed error messages
- Review browser console for client-side errors
- Check server logs for API errors
