# Email Notifications Setup

The cricket platform includes email notification functionality for:
- User role changes
- User invitations
- Other administrative actions

## Current Status

Email notifications are **implemented but disabled by default**. The code is ready and will log email attempts to the console when email service is not configured.

## Setup Instructions

To enable email notifications, choose one of the following email service providers and follow the setup instructions:

### Option 1: Resend (Recommended)

Resend is a modern email API with a generous free tier and excellent developer experience.

1. **Sign up for Resend**
   - Go to https://resend.com
   - Create a free account
   - Verify your domain (or use their testing domain)

2. **Get your API key**
   - Navigate to API Keys in the Resend dashboard
   - Create a new API key
   - Copy the key (starts with `re_`)

3. **Install the Resend package**
   ```bash
   npm install resend
   ```

4. **Add environment variables**
   Add to your `.env.local` file:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=noreply@yourdomain.com
   NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
   ```

5. **Uncomment the Resend implementation**
   In `apps/web/lib/email.ts`, uncomment these lines:
   ```typescript
   const { Resend } = await import('resend')
   const resend = new Resend(resendApiKey)

   await resend.emails.send({
     from: fromEmail,
     to,
     subject,
     html,
     text: text || stripHtml(html)
   })
   ```

### Option 2: SendGrid

SendGrid is a popular email service provider with a free tier.

1. **Sign up for SendGrid**
   - Go to https://sendgrid.com
   - Create a free account
   - Verify your sender identity

2. **Get your API key**
   - Navigate to Settings > API Keys
   - Create a new API key with full access
   - Copy the key (starts with `SG.`)

3. **Install the SendGrid package**
   ```bash
   npm install @sendgrid/mail
   ```

4. **Add environment variables**
   Add to your `.env.local` file:
   ```env
   SENDGRID_API_KEY=SG.your_api_key_here
   EMAIL_FROM=noreply@yourdomain.com
   NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
   ```

5. **Uncomment the SendGrid implementation**
   In `apps/web/lib/email.ts`, uncomment these lines:
   ```typescript
   const sgMail = await import('@sendgrid/mail')
   sgMail.setApiKey(sendgridApiKey)

   await sgMail.send({
     to,
     from: fromEmail,
     subject,
     html,
     text: text || stripHtml(html)
   })
   ```

### Option 3: AWS SES

AWS Simple Email Service is cost-effective for high-volume sending.

1. **Set up AWS SES**
   - Configure AWS credentials
   - Verify your sending domain
   - Request production access (if needed)

2. **Install AWS SDK**
   ```bash
   npm install @aws-sdk/client-ses
   ```

3. **Add environment variables**
   ```env
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   EMAIL_FROM=noreply@yourdomain.com
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Implement AWS SES in email.ts**
   You'll need to add the implementation code for AWS SES in the `sendEmail` function.

## Email Templates

The platform includes pre-built HTML email templates for:

### Role Change Notification
Sent when an administrator changes a user's role.
- Shows old role → new role
- Lists new permissions
- Branded with platform colors

### User Invitation
Sent when an administrator invites a new user.
- Includes invitation link with token
- Shows assigned role
- Expires in 7 days

## Testing Email Functionality

### Without Email Service (Development)
Email notifications will log to the console:
```
Email would be sent to: user@example.com
Subject: Your Role Has Been Updated
To enable email sending, configure RESEND_API_KEY or SENDGRID_API_KEY
```

### With Email Service (Production)
1. Configure environment variables
2. Restart your development server
3. Test by:
   - Changing a user's role in the Users page
   - Inviting a new user
   - Check the recipient's inbox
   - Check server logs for any errors

## Troubleshooting

### Emails not sending
- Check environment variables are set correctly
- Verify API key is valid
- Check server logs for error messages
- Ensure your domain is verified with the email provider

### Emails going to spam
- Set up SPF, DKIM, and DMARC records for your domain
- Use a verified sending domain (not a free email provider)
- Follow email provider's authentication guidelines

### Rate limits
- Free tiers typically have daily sending limits
- Monitor your usage in the provider's dashboard
- Upgrade to paid plan if needed

## Security Considerations

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate API keys periodically
- Monitor for unusual sending patterns
- Implement rate limiting if needed

## Future Enhancements

Potential additions for email notifications:
- Match result notifications
- Player statistics summaries
- Season end reports
- Custom email templates via admin UI
- Email preferences per user
- Digest emails (daily/weekly summaries)
