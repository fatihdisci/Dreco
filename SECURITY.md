# Security hardening checklist

This project runs mostly on the client side, so API restrictions must be enforced in Google Cloud Console.

## Required key restrictions

### YouTube Data API key
- Restrict by **HTTP referrers** to your production domain(s).
- Restrict API usage to **YouTube Data API v3** only.
- Rotate key if it has ever been shared publicly without restrictions.

### OAuth client (GIS)
- Keep the **Authorized JavaScript origins** list minimal.
- Remove temporary/test origins after release.

## Browser hardening
- Keep Content-Security-Policy meta tags enabled in HTML entry pages.
- Avoid adding third-party script origins unless required.

## Local token handling
- Access token is stored in localStorage for session continuity.
- Frontend-only Google Identity Services access tokens are not permanent; truly infinite sessions are not possible.
- Use `prompt: ''` for normal sign-in/silent refresh flows; reserve `prompt: 'consent'` only when explicit re-consent is required.
- Fully removing Google's unverified app warning requires OAuth Consent Screen verification, authorized domain setup, privacy policy, and terms configuration in Google Cloud.
- If you later add user-generated HTML rendering, apply strict sanitization to prevent XSS.
