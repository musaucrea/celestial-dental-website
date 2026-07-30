# Google Tag Manager — setup guide

The site is fully wired for GTM. Everything below the "Site is ready" line already
works; the remaining steps happen in your Google Tag Manager / GA4 / Ads / Meta
accounts and take ~20 minutes.

## Step 0 — Activate GTM on the site

1. Create a container at https://tagmanager.google.com (type: **Web**) and copy
   its id (looks like `GTM-XXXXXXX`).
2. Put the id in [src/data/site.ts](src/data/site.ts) (`export const gtmId = 'GTM-XXXXXXX'`),
   rebuild, and redeploy (Vercel + cPanel zip).
3. GTM loads **only after a visitor taps "Allow" on the cookie banner** — this is
   deliberate (consent-first). Events fired before consent queue in the browser
   and are never sent if the visitor declines.

## Site is ready — events already pushed to the dataLayer

| Event | When it fires | Parameters |
|---|---|---|
| `whatsapp_click` | Any WhatsApp link/button, sitewide | `link_url`, `link_text`, `page_path` |
| `call_click` | Any phone (tel:) link, sitewide | `phone_number`, `link_text`, `page_path` |
| `booking_open` | Braces-page CTA opens the booking form | `service`, `cta`, `page_path` |
| `booking_submitted` | Appointment form saved successfully | `service`, `branch`, `page_path` |

The Meta Pixel (if `VITE_META_PIXEL_ID` is set at build time) also receives
`Contact` on whatsapp/call clicks and `Lead` on form submission.

## Step 1 — GA4 + conversion tags in GTM

1. In GTM: **Tags → New → Google Analytics: GA4 Configuration**, enter your GA4
   Measurement ID (`G-…`), trigger: All Pages. Also enable the built-in
   **History Change** trigger so SPA page navigations count.
2. For each site event above: **Triggers → New → Custom Event**, event name
   exactly as in the table. Then **Tags → New → GA4 Event** referencing the
   config tag, same event name, and map the parameters
   (Variables → New → Data Layer Variable: `service`, `branch`, `link_url`, …).
3. In **GA4 → Admin → Events**, flag `booking_submitted`, `whatsapp_click`, and
   `call_click` as **key events (conversions)**.

## Step 2 — Google Ads conversions (when you run ads)

1. Link Google Ads to GA4 (GA4 Admin → Product links) and import the three key
   events as conversions, **or** create a Google Ads Conversion Tracking tag in
   GTM fired by the same custom-event triggers.
2. Recommended primary conversion: `booking_submitted`. Count whatsapp/call
   clicks as secondary ("Contact") conversions.

## Step 3 — Visitor audiences

Create these in **GA4 → Admin → Audiences** (they auto-sync to a linked Google
Ads account):

| Audience | Definition | Use |
|---|---|---|
| All visitors 30d | default | broad retargeting |
| Braces intent | `page_path` contains `/braces` OR `booking_open` with `service = Orthodontics (Braces)` | braces campaign retargeting |
| High intent, no booking | `whatsapp_click` OR `call_click` OR `booking_open`, EXCLUDE `booking_submitted` | "finish your booking" retargeting |
| Converters | `booking_submitted` | exclusion list + lookalike seed |
| Blog readers | `page_path` contains `/blog/` | nurture/awareness |

Meta equivalent (Events Manager → Audiences): website visitors 30d, visitors of
`/braces`, `Contact` event, `Lead` event — the pixel events are already sent.

## Testing

Use GTM **Preview** mode on https://celestialdental.org, tap "Allow" on the
cookie banner, then click a WhatsApp button, a phone number, and submit a test
booking (delete it afterwards in the admin dashboard) — each should appear in
the preview stream as `whatsapp_click` / `call_click` / `booking_submitted`.
