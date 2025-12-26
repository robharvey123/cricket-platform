import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's role
    const { data: userRole, error: roleError } = await supabase
      .from('user_org_roles')
      .select('role, club_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    // Only admins can view audit logs
    if (userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const entityType = searchParams.get('entityType')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('club_id', userRole.club_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (entityType && entityType !== 'all') {
      query = query.eq('entity_type', entityType)
    }

    if (action && action !== 'all') {
      query = query.eq('action', action)
    }

    // Execute query
    const { data: logs, error: logsError } = await query

    if (logsError) {
      throw logsError
    }

    return NextResponse.json({
      logs: logs || [],
      count: logs?.length || 0
    })
  } catch (error: any) {
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
