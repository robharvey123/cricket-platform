import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== PDF Parse Request Started ===')

    // Dynamic imports for packages that don't bundle well
    console.log('Step 1: Loading Anthropic SDK...')
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    console.log('✓ Anthropic SDK loaded successfully')

    console.log('Step 2: Loading pdf-parse...')
    const pdf = (await import('pdf-parse')).default
    console.log('✓ pdf-parse loaded successfully')

    // Get the uploaded PDF file
    console.log('Step 3: Parsing form data...')
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

    // Convert file to buffer
    console.log('Step 4: Converting file to buffer...')
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log(`✓ Buffer created: ${buffer.length} bytes`)

    // Extract text from PDF
    console.log('Step 5: Extracting text from PDF...')
    const pdfData = await pdf(buffer)
    const pdfText = pdfData.text
    console.log(`✓ Text extracted: ${pdfText.length} characters`)

    if (!pdfText || pdfText.trim().length === 0) {
      console.error('✗ Could not extract text from PDF')
      return NextResponse.json(
        { error: 'Could not extract text from PDF' },
        { status: 400 }
      )
    }

    // Initialize Anthropic client
    console.log('Step 6: Checking Anthropic API key...')
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      console.error('✗ Anthropic API key not found in environment')
      return NextResponse.json(
        { error: 'Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your .env.local file.' },
        { status: 500 }
      )
    }
    console.log('✓ API key found')

    console.log('Step 7: Initializing Anthropic client...')
    const anthropic = new Anthropic({
      apiKey: apiKey,
    })
    console.log('✓ Anthropic client initialized')

    // Create the parsing prompt
    const prompt = `You are a cricket scorecard parser. Extract all match data from the following cricket scorecard text and return it as a JSON object.

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

Here is the scorecard text to parse:

${pdfText}

Return ONLY the JSON object, no additional text or explanation.`

    // Call Claude API
    console.log('Step 8: Calling Claude API...')
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
    console.log('✓ Claude API call successful')

    // Extract the JSON from Claude's response
    console.log('Step 9: Extracting JSON from response...')
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''
    console.log(`✓ Response text length: ${responseText.length} characters`)

    // Parse the JSON
    console.log('Step 10: Parsing JSON...')
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
