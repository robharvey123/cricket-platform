import { NextRequest, NextResponse } from 'next/server'
import { PlayCricketClient } from '@/lib/play-cricket/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { site_id, api_token } = body

    if (!site_id || !api_token) {
      return NextResponse.json(
        { error: 'Site ID and API Token are required' },
        { status: 400 }
      )
    }

    // Create Play-Cricket client with provided credentials
    const client = new PlayCricketClient({
      siteId: site_id,
      apiToken: api_token,
    })

    try {
      // Try to fetch result summary (recent matches)
      const results = await client.getResultSummary()

      // If we get here, credentials are valid
      return NextResponse.json({
        success: true,
        message: 'Credentials verified successfully',
        matchCount: results.results?.length || 0,
      })
    } catch (apiError: any) {
      // Play-Cricket API error - likely invalid credentials
      return NextResponse.json(
        {
          error: `Play-Cricket API error: ${apiError.message || 'Invalid credentials or API access denied'}`,
          details: apiError.code
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Test credentials error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
