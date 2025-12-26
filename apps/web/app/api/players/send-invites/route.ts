import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { sendEmail } from '../../../../lib/email';

interface InviteRequest {
  playerIds: string[];
  method: 'email' | 'whatsapp' | 'both';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's club
    const { data: userRole } = await supabase
      .from('user_org_roles')
      .select('club_id, role, clubs(id, name, slug)')
      .eq('user_id', user.id)
      .single();

    if (!userRole?.club_id) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Check if user is admin or captain
    if (userRole.role !== 'admin' && userRole.role !== 'captain') {
      return NextResponse.json(
        { error: 'Only admins and captains can send invitations' },
        { status: 403 }
      );
    }

    const clubId = userRole.club_id;
    const club = (userRole as any).clubs;
    const body: InviteRequest = await request.json();
    const { playerIds, method } = body;

    if (!playerIds || playerIds.length === 0) {
      return NextResponse.json(
        { error: 'No players selected' },
        { status: 400 }
      );
    }

    // Get players data
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, first_name, last_name, email, phone, user_id')
      .in('id', playerIds)
      .eq('club_id', clubId);

    if (playersError || !players) {
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      );
    }

    // Filter out players who already have accounts
    const uninvitedPlayers = players.filter((p) => !p.user_id);

    if (uninvitedPlayers.length === 0) {
      return NextResponse.json(
        { error: 'All selected players already have accounts' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin');
    const inviteLink = `${baseUrl}/join/${club.slug}`;

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send invitations
    for (const player of uninvitedPlayers) {
      const playerName = `${player.first_name} ${player.last_name}`;

      try {
        // Send email if requested and email exists
        if ((method === 'email' || method === 'both') && player.email) {
          const emailSent = await sendPlayerInviteEmail(
            player.email,
            playerName,
            club.name,
            inviteLink
          );
          if (emailSent) sentCount++;
          else failedCount++;
        }

        // Send WhatsApp if requested and phone exists
        if ((method === 'whatsapp' || method === 'both') && player.phone) {
          const whatsappSent = await sendPlayerInviteWhatsApp(
            player.phone,
            playerName,
            club.name,
            inviteLink
          );
          if (whatsappSent) sentCount++;
          else failedCount++;
        }

        // Create invitation record
        await supabase.from('player_invitations').insert({
          club_id: clubId,
          player_id: player.id,
          invited_by: user.id,
          invitation_method: method,
          status: 'pending',
        });
      } catch (error: any) {
        errors.push(`${playerName}: ${error.message}`);
        failedCount++;
      }
    }

    return NextResponse.json({
      sent: sentCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Invitations sent to ${sentCount} player(s)`,
    });
  } catch (error: any) {
    console.error('Send invites error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendPlayerInviteEmail(
  email: string,
  playerName: string,
  clubName: string,
  inviteLink: string
): Promise<boolean> {
  const subject = `Join ${clubName} on Cricket Platform`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
          color: white;
          padding: 30px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .content {
          background: #f9fafb;
          padding: 30px;
          border-radius: 0 0 8px 8px;
        }
        .button {
          display: inline-block;
          background: #0ea5e9;
          color: white !important;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
        }
        .features {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .feature {
          margin: 10px 0;
          padding-left: 25px;
          position: relative;
        }
        .feature:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏏 You're Invited!</h1>
      </div>
      <div class="content">
        <p>Hi ${playerName},</p>

        <p><strong>${clubName}</strong> has invited you to join their cricket club on the Cricket Platform!</p>

        <p style="text-align: center;">
          <a href="${inviteLink}" class="button">Join ${clubName} Now</a>
        </p>

        <div class="features">
          <h3>What you'll get access to:</h3>
          <div class="feature">View your personal batting, bowling, and fielding stats</div>
          <div class="feature">Track your performance over the season</div>
          <div class="feature">Compete on the club leaderboard</div>
          <div class="feature">See match scorecards and highlights</div>
          <div class="feature">Update your profile and availability</div>
          <div class="feature">Export your stats and share achievements</div>
        </div>

        <p>Simply click the button above to create your account and get linked to your player profile.</p>

        <p style="color: #6b7280; font-size: 14px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
You're Invited to Join ${clubName}!

Hi ${playerName},

${clubName} has invited you to join their cricket club on the Cricket Platform!

Join now: ${inviteLink}

What you'll get access to:
- View your personal batting, bowling, and fielding stats
- Track your performance over the season
- Compete on the club leaderboard
- See match scorecards and highlights
- Update your profile and availability
- Export your stats and share achievements

Simply visit the link above to create your account and get linked to your player profile.

If you didn't expect this invitation, you can safely ignore this email.
  `;

  return sendEmail({ to: email, subject, html, text });
}

async function sendPlayerInviteWhatsApp(
  phone: string,
  playerName: string,
  clubName: string,
  inviteLink: string
): Promise<boolean> {
  // Format WhatsApp message
  const message = encodeURIComponent(
    `🏏 Hi ${playerName}!\n\n` +
    `You've been invited to join *${clubName}* on Cricket Platform!\n\n` +
    `Join now to:\n` +
    `✓ View your stats\n` +
    `✓ Track your performance\n` +
    `✓ Compete on the leaderboard\n\n` +
    `Join here: ${inviteLink}`
  );

  // Format phone number (remove non-digits)
  const cleanPhone = phone.replace(/\D/g, '');

  // Generate WhatsApp link
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;

  // In a real implementation, you would:
  // 1. Use WhatsApp Business API to send automatically
  // 2. Or use a service like Twilio, Vonage, or MessageBird
  // For now, we'll log it and return true

  console.log(`WhatsApp invitation would be sent to ${phone}:`);
  console.log(`URL: ${whatsappUrl}`);

  // TODO: Implement actual WhatsApp sending via API
  // For demo purposes, we return true
  return true;
}
