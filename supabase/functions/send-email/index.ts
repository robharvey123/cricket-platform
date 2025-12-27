import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { to, subject, template, props } = await req.json()

  // Generate HTML based on template
  const html = generateEmailHtml(template, props)

  const { data, error } = await resend.emails.send({
    from: 'MVP Cricket <noreply@mvpcricket.app>',
    to,
    subject,
    html,
  })

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, id: data?.id }), { status: 200 })
})

function generateEmailHtml(template: string, props: any): string {
  const templates: Record<string, (props: any) => string> = {
    availability_request: (p) => `
      <h2>Availability Request</h2>
      <p>Hi ${p.playerName},</p>
      <p><strong>${p.captainName}</strong> needs to know if you're available.</p>
      <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
        <p><strong>${p.clubName} vs ${p.opponent}</strong></p>
        <p>📅 ${p.date} at ${p.time}</p>
        <p>📍 ${p.venue}</p>
      </div>
      <p><strong>Please respond by ${p.deadline}</strong></p>
      <p>
        <a href="${p.availableUrl}" style="background:#10b981;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;margin-right:8px">✅ Available</a>
        <a href="${p.maybeUrl}" style="background:#f59e0b;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;margin-right:8px">🤔 Maybe</a>
        <a href="${p.unavailableUrl}" style="background:#ef4444;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">❌ Can't</a>
      </p>
    `,

    selection_notification: (p) => `
      <h2>${p.isReserve ? "You're on the reserves!" : "You've been selected!"}</h2>
      <p>Hi ${p.playerName},</p>
      <p>You've been ${p.isReserve ? 'named as a reserve' : 'selected'} for <strong>${p.clubName}</strong>.</p>
      <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0">
        <p><strong>vs ${p.opponent}</strong></p>
        <p>📅 ${p.date} at ${p.time}</p>
        <p>📍 ${p.venue}</p>
        ${!p.isReserve ? `<p>🏏 Batting: #${p.battingPosition}</p>` : ''}
      </div>
      <p>
        <a href="${p.confirmUrl}" style="background:#10b981;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;margin-right:8px">✅ Confirm</a>
        <a href="${p.withdrawUrl}" style="background:#ef4444;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">❌ Can't Make It</a>
      </p>
    `,

    invite: (p) => `
      <h2>You're Invited to ${p.clubName}!</h2>
      <p><strong>${p.inviterName}</strong> has invited you to join <strong>${p.clubName}</strong> as a <strong>${p.role}</strong>.</p>
      <p><a href="${p.inviteUrl}" style="background:#4f46e5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:20px 0">Accept Invitation</a></p>
      <p style="color:#6b7280;font-size:14px">This invitation expires in 7 days.</p>
    `,
  }

  const templateFn = templates[template]
  if (!templateFn) {
    throw new Error(`Unknown template: ${template}`)
  }

  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="text-align:center;margin-bottom:20px">
          <h1 style="color:#1e40af">MVP Cricket</h1>
        </div>
        ${templateFn(props)}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:40px 0 20px">
        <p style="color:#9ca3af;font-size:12px;text-align:center">© ${new Date().getFullYear()} MVP Cricket</p>
      </body>
    </html>
  `
}
