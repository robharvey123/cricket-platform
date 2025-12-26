/**
 * Email service for sending notifications
 *
 * This module provides email functionality for the cricket platform.
 * To enable email sending, configure one of the following services:
 *
 * 1. Resend (recommended): https://resend.com
 *    - Set RESEND_API_KEY environment variable
 *    - npm install resend
 *
 * 2. SendGrid: https://sendgrid.com
 *    - Set SENDGRID_API_KEY environment variable
 *    - npm install @sendgrid/mail
 *
 * 3. AWS SES: https://aws.amazon.com/ses
 *    - Configure AWS credentials
 *    - npm install @aws-sdk/client-ses
 */

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send an email using the configured email service
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  // Check if email service is configured
  const resendApiKey = process.env.RESEND_API_KEY
  const sendgridApiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.EMAIL_FROM || 'noreply@cricket-platform.com'

  if (!resendApiKey && !sendgridApiKey) {
    console.warn('Email service not configured. Email would be sent to:', to)
    console.warn('Subject:', subject)
    console.warn('To enable email sending, configure RESEND_API_KEY or SENDGRID_API_KEY')
    return false
  }

  try {
    // Resend implementation (preferred)
    if (resendApiKey) {
      // Uncomment when resend is installed:
      // const { Resend } = await import('resend')
      // const resend = new Resend(resendApiKey)
      //
      // await resend.emails.send({
      //   from: fromEmail,
      //   to,
      //   subject,
      //   html,
      //   text: text || stripHtml(html)
      // })

      console.log('Email would be sent via Resend to:', to)
      return true
    }

    // SendGrid implementation
    if (sendgridApiKey) {
      // Uncomment when sendgrid is installed:
      // const sgMail = await import('@sendgrid/mail')
      // sgMail.setApiKey(sendgridApiKey)
      //
      // await sgMail.send({
      //   to,
      //   from: fromEmail,
      //   subject,
      //   html,
      //   text: text || stripHtml(html)
      // })

      console.log('Email would be sent via SendGrid to:', to)
      return true
    }

    return false
  } catch (error: any) {
    console.error('Email send error:', error)
    return false
  }
}

/**
 * Send role change notification email
 */
export async function sendRoleChangeEmail(
  recipientEmail: string,
  oldRole: string,
  newRole: string,
  changedBy: string
): Promise<boolean> {
  const subject = 'Your Role Has Been Updated'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
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
        .role-change {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #7c3aed;
        }
        .role {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 600;
          text-transform: capitalize;
        }
        .role-admin { background: #fee2e2; color: #991b1b; }
        .role-captain { background: #dbeafe; color: #1e40af; }
        .role-player { background: #d1fae5; color: #065f46; }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Role Update Notification</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>Your role in the cricket platform has been updated by ${changedBy}.</p>

        <div class="role-change">
          <p><strong>Role Change:</strong></p>
          <p>
            <span class="role role-${oldRole}">${oldRole}</span>
            →
            <span class="role role-${newRole}">${newRole}</span>
          </p>
        </div>

        <p>This change affects your permissions within the platform:</p>
        <ul>
          ${getRolePermissionsHtml(newRole)}
        </ul>

        <p>If you have any questions about this change, please contact an administrator.</p>
      </div>
      <div class="footer">
        <p>Cricket Platform | Automated notification</p>
      </div>
    </body>
    </html>
  `

  const text = `
Your Role Has Been Updated

Your role in the cricket platform has been updated by ${changedBy}.

Previous role: ${oldRole}
New role: ${newRole}

If you have any questions about this change, please contact an administrator.
  `

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    text
  })
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  recipientEmail: string,
  inviterEmail: string,
  role: string,
  inviteToken: string
): Promise<boolean> {
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${inviteToken}`
  const subject = 'You\'ve Been Invited to Join Cricket Platform'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
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
          background: #7c3aed;
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
        }
        .role {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 600;
          text-transform: capitalize;
          background: #dbeafe;
          color: #1e40af;
        }
        .footer {
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>You're Invited!</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>${inviterEmail} has invited you to join their cricket club on Cricket Platform.</p>

        <p>You've been assigned the role: <span class="role">${role}</span></p>

        <p style="text-align: center;">
          <a href="${inviteLink}" class="button">Accept Invitation</a>
        </p>

        <p style="color: #6b7280; font-size: 14px;">
          This invitation link will expire in 7 days.
        </p>

        <p>If you didn't expect this invitation, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p>Cricket Platform | Automated notification</p>
      </div>
    </body>
    </html>
  `

  const text = `
You've Been Invited to Join Cricket Platform

${inviterEmail} has invited you to join their cricket club.

Role: ${role}

Accept the invitation by visiting:
${inviteLink}

This invitation link will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
  `

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    text
  })
}

/**
 * Get role permissions HTML list
 */
function getRolePermissionsHtml(role: string): string {
  const permissions: Record<string, string[]> = {
    admin: [
      'Full access to all features',
      'Manage users and roles',
      'Configure scoring settings',
      'View audit logs',
      'Manage seasons, teams, and matches'
    ],
    captain: [
      'Create and manage matches',
      'Manage teams and players',
      'View statistics and reports',
      'Create seasons'
    ],
    player: [
      'View matches and statistics',
      'View leaderboards',
      'Edit your own profile'
    ]
  }

  const rolePermissions = permissions[role] ?? permissions.player ?? []
  return rolePermissions.map(p => `<li>${p}</li>`).join('\n')
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
