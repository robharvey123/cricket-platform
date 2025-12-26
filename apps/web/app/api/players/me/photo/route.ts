import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../../lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })
    }

    // Get user's club
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id')
      .eq('user_id', user.id)
      .single()

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, first_name, last_name, user_id')
      .eq('user_id', user.id)
      .eq('club_id', userRole.club_id)
      .single()

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player profile not found' }, { status: 404 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${user.id}/${player.id}/${Date.now()}-${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('player-photos')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      throw new Error(uploadError.message)
    }

    const { data: publicUrl } = supabase.storage
      .from('player-photos')
      .getPublicUrl(path)

    const { data: updated, error: updateError } = await supabase
      .from('players')
      .update({ photo_url: publicUrl.publicUrl })
      .eq('id', player.id)
      .select('id, first_name, last_name, user_id, bio, preferred_position, jersey_number, photo_url')
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    const displayName = `${updated.first_name || ''} ${updated.last_name || ''}`.trim()

    return NextResponse.json({
      player: {
        ...updated,
        name: displayName
      }
    })
  } catch (error: any) {
    console.error('Upload player photo error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
