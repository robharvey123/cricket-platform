import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== PDF Parse Request Started ===')

    // Get the uploaded PDF file
    console.log('Step 1: Parsing form data...')
    const formData = await request.formData()
    const file = formData.get('pdf') as File
    console.log(`✓ File received: ${file?.name || 'unknown'}, size: ${file?.size || 0} bytes`)

    if (!file) {
      console.error('✗ No PDF file uploaded')
      return NextResponse.json(
        { error: 'No PDF file uploaded' },
        { status: 400 }
      )
    }

    // Convert file to base64 for Anthropic API
    console.log('Step 2: Converting PDF to base64...')
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64PDF = buffer.toString('base64')
    console.log(`✓ PDF converted: ${base64PDF.length} characters`)

    // Check Anthropic API key
    console.log('Step 3: Checking Anthropic API key...')
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      console.error('✗ Anthropic API key not found in environment')
      return NextResponse.json(
        { error: 'Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your .env.local file.' },
        { status: 500 }
      )
    }
    console.log('✓ API key found')

    // Create the parsing prompt
    const prompt = `You are a cricket scorecard parser. Extract all match data from the cricket scorecard PDF and return it as a JSON object.

IMPORTANT: The JSON must match this exact structure:

{
  "match": {
    "match_date": "YYYY-MM-DD",
    "opponent_name": "string",
    "venue": "string or null",
    "match_type": "league" | "cup" | "friendly",
    "result": "won" | "lost" | "tied" | "draw" | "abandoned"
  },
  "innings": [
    {
      "innings_number": 1 or 2,
      "batting_team": "home" or "away",
      "total_runs": number,
      "wickets": number,
      "overs": number (as decimal, e.g., 41.5),
      "extras": number,
      "batting_cards": [
        {
          "player_name": "First Last",
          "position": number (1-11),
          "dismissal_type": "caught" | "bowled" | "lbw" | "run out" | "stumped" | null if not out,
          "dismissal_text": "string describing full dismissal",
          "is_out": boolean,
          "runs": number,
          "balls_faced": number,
          "fours": number,
          "sixes": number
        }
      ],
      "bowling_cards": [
        {
          "player_name": "First Last",
          "overs": number (as decimal),
          "maidens": number,
          "runs_conceded": number,
          "wickets": number,
          "wides": number,
          "no_balls": number
        }
      ]
    }
  ]
}

Guidelines:
- Extract player names carefully (first and last name)
- For batting_team, use "home" if it's your team batting, "away" if it's the opponent
- Parse dismissal types accurately (caught, bowled, lbw, run out, stumped, etc.)
- If a player is "not out", set dismissal_type to null and is_out to false
- Extract all statistics accurately (runs, balls, 4s, 6s, overs, maidens, wickets, etc.)
- Overs should be decimal (e.g., 41.5 means 41 overs and 5 balls)
- Extract extras as the total number
- For match_type, infer from the context (league/cup/friendly)
- For result, extract who won and how (e.g., "won", "lost")

Return ONLY the JSON object, no additional text or explanation.`

    // Call Claude API using fetch with PDF document support
    console.log('Step 4: Calling Claude API with PDF document...')
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64PDF,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.json()
      throw new Error(`Anthropic API error: ${JSON.stringify(errorData)}`)
    }

    const anthropicData = await anthropicResponse.json()
    console.log('✓ Claude API call successful')

    // Extract the JSON from Claude's response
    console.log('Step 5: Extracting JSON from response...')
    let responseText = anthropicData.content[0]?.text || ''
    console.log(`✓ Response text length: ${responseText.length} characters`)

    // Remove markdown code fences if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Parse the JSON
    console.log('Step 6: Parsing JSON...')
    const parsedData = JSON.parse(responseText)
    console.log('✓ JSON parsed successfully')
    console.log('=== PDF Parse Request Completed Successfully ===')

    return NextResponse.json(parsedData)

  } catch (error: any) {
    console.error('=== PDF PARSING ERROR ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error('========================')

    return NextResponse.json(
      {
        error: 'Failed to parse PDF',
        details: error.message,
        errorType: error.name,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
