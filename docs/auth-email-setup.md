# PacerGo Auth Email Setup

Use this checklist for production Supabase Auth emails.

## Sender Address

Supabase's default sender is only for development. To send from a PacerGo address, configure custom SMTP in Supabase:

1. Choose an SMTP provider, such as Resend, Postmark, SendGrid, AWS SES, Brevo, or ZeptoMail.
2. Verify the sending domain with that provider.
3. Add the provider's required DNS records for SPF, DKIM, and any return-path/bounce domain.
4. In Supabase Dashboard, go to Authentication > Emails/SMTP and enable custom SMTP.
5. Use a sender like:

```text
From name: PacerGo
From email: no-reply@app.pacergo.app
```

If `app.pacergo.app` is not your email-sending domain, use a domain you control for mail instead, for example `no-reply@pacergo.app`.

## URL Configuration

In Supabase Dashboard > Authentication > URL Configuration:

```text
Site URL:
https://app.pacergo.app

Redirect URLs:
https://app.pacergo.app/**
```

For local development only:

```text
http://localhost:3000/**
http://127.0.0.1:3000/**
```

Do not use a bare domain like `app.pacergo.app`. It must include `https://`
for production, or `http://` for local development.

Do not use Supabase API URLs as the app URL:

```text
https://PROJECT_REF.supabase.co/rest/v1
https://PROJECT_REF.supabase.co/auth/v1
```

## Confirm Signup Template

Subject:

```text
Confirm your PacerGo email
```

HTML:

```html
<h2>Confirm your PacerGo email</h2>
<p>Welcome to PacerGo. Confirm this email address to finish creating your account.</p>
<p>
  <a href="{{ .ConfirmationURL }}">Confirm email address</a>
</p>
<p>If you did not create a PacerGo account, you can ignore this email.</p>
```

## Reset Password Template

Subject:

```text
Reset your PacerGo password
```

HTML:

```html
<h2>Reset your PacerGo password</h2>
<p>Use the link below to choose a new password for your PacerGo account.</p>
<p>
  <a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=recovery">Reset password</a>
</p>
<p>If you did not request a password reset, you can ignore this email.</p>
```

Use the `token_hash` link above instead of `{{ .ConfirmationURL }}`. The app's
password reset route supports `token_hash` directly, which avoids browser-specific
PKCE verifier issues when a reset email is opened from a mail app, another
browser, or a preview URL.

The same template works for localhost. When you request the reset from
`http://localhost:3000`, `{{ .RedirectTo }}` becomes the local recovery callback,
for example:

```text
http://localhost:3000/en/auth/recovery?flow=recovery&token_hash=TOKEN&type=recovery
```

## Testing

After changing URL settings, custom SMTP, or templates, request a fresh email. Old emails keep the old link and cannot be repaired.
