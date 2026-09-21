# Free production setup

## What remains free

- **Website:** GitHub Pages hosts the static site from this public repository.
- **Live wedding data:** Supabase's free tier can hold invitations, RSVPs and moderated photo metadata within its current quotas.
- **Permanent keepsake:** after the wedding, export an independent static archive and download all original photos. Keep copies in GitHub Releases and on two family-owned drives.

No third party guarantees that its free plan will exist forever. The static archive is the durability strategy.

## 1. Create the family-owned Supabase project

1. Visit `https://supabase.com/dashboard` and sign in using an account controlled by the family.
2. Create a free project and save its database password in the family's password manager.
3. Open **SQL Editor** and run `supabase/migrations/001_wedding_backend.sql`.
4. In **Authentication → Users**, invite/create Alisha's host account.
5. In SQL Editor, make that account a host:

```sql
insert into public.wedding_hosts (user_id, display_name)
select id, 'Alisha Ahmed' from auth.users where email = 'ALISHA_EMAIL_HERE';
```

## 2. Add public browser configuration

From **Project Settings → API**, copy only:

- Project URL → `VITE_SUPABASE_URL`
- Public anonymous key → `VITE_SUPABASE_ANON_KEY`

Never expose the service-role key. Add the public values to the deployment environment, not directly to source control.

## 3. Production checks

Before sending real invitations:

- Host login works on a second device.
- A named invitation can be created and opened from WhatsApp.
- A guest cannot RSVP for more than the invitation limit.
- The response appears in Alisha's dashboard on another device.
- Approval, CSV export and wedding-day check-in work.
- An unapproved photo is not publicly visible.
- Database and photo exports are downloaded and verified.

## 4. Archive after the wedding

Export the final guest book, approved photographs, invitation and website as static files. Produce at least three copies:

1. GitHub Release archive
2. Family-owned external drive
3. A second drive or cloud account owned by another trusted family member
