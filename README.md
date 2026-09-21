# Mohammed Raees Khan & Alisha Ahmed — Wedding Keepsake

A responsive Muslim wedding invitation, RSVP system and digital keepsake in an elegant sage, silver and ivory palette with subtle South Asian–Chinese details.

## Event

- **Date:** 24 October 2026
- **Location:** Katima Mulilo, Namibia
- **RSVP deadline:** 5 October 2026
- **Celebration:** Nikah and reception

## Features

- Personalised WhatsApp e-invitations with an animated opening envelope
- Named invitations with server-enforced party limits
- Central Supabase RSVP submission and bride/host approvals
- CSV guest export, table planning and wedding-day check-in
- Invitation-only guest photo uploads with host moderation
- Host-controlled visibility for the album and family tree
- Secure Supabase host authentication and password recovery
- Responsive public website and private planning console
- Family and friends tree
- Bride design questionnaire
- Permanent static-archive strategy for the post-wedding keepsake

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when connecting a different Supabase project. Never place a Supabase secret or service-role key in this browser application.

## Database migrations

Run migrations in order through Supabase SQL Editor:

1. `supabase/migrations/001_wedding_backend.sql`
2. `supabase/migrations/002_guest_album.sql`
3. `supabase/migrations/003_privacy_settings.sql`

See `docs/PRODUCTION_SETUP.md` for host setup, production checks and archival instructions.

## Deployment

GitHub Actions builds the Vite application and deploys it to GitHub Pages whenever the Arena working branch is pushed. The Supabase URL and publishable browser key are included in the build; database access is protected by Row Level Security and validated RPC functions.

No third-party free plan can be guaranteed forever. After the wedding, export an independent static archive and retain copies in GitHub Releases and on at least two family-owned storage devices.

---

Crafted by Ace Khan.
