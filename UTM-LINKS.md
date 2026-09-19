# Celestial Dental UTM links

Use these exact URLs when linking to the website from each channel. Keeping the
parameters consistent prevents WhatsApp, social, email, and SMS traffic from
being grouped under **Direct** in Google Analytics.

## WhatsApp

- Profile/about: https://celestialdental.org/?utm_source=whatsapp&utm_medium=messaging&utm_campaign=profile
- Status: https://celestialdental.org/?utm_source=whatsapp&utm_medium=messaging&utm_campaign=status
- Appointment messages: https://celestialdental.org/?book=1&utm_source=whatsapp&utm_medium=messaging&utm_campaign=appointment

## Google Business Profile

- Kasarani: https://celestialdental.org/branches/kasarani?utm_source=google&utm_medium=organic&utm_campaign=gbp_kasarani
- Kamakis: https://celestialdental.org/branches/kamakis?utm_source=google&utm_medium=organic&utm_campaign=gbp_kamakis
- Eldoret: https://celestialdental.org/branches/eldoret?utm_source=google&utm_medium=organic&utm_campaign=gbp_eldoret

## Instagram

- Bio: https://celestialdental.org/?utm_source=instagram&utm_medium=social&utm_campaign=profile
- Stories: https://celestialdental.org/?utm_source=instagram&utm_medium=social&utm_campaign=stories
- Appointment CTA: https://celestialdental.org/?book=1&utm_source=instagram&utm_medium=social&utm_campaign=appointment

## Facebook

- Page website field: https://celestialdental.org/?utm_source=facebook&utm_medium=social&utm_campaign=profile
- Posts: https://celestialdental.org/?utm_source=facebook&utm_medium=social&utm_campaign=posts
- Appointment CTA: https://celestialdental.org/?book=1&utm_source=facebook&utm_medium=social&utm_campaign=appointment

## Email

- Email signature: https://celestialdental.org/?utm_source=email&utm_medium=email&utm_campaign=signature
- Appointment CTA: https://celestialdental.org/?book=1&utm_source=email&utm_medium=email&utm_campaign=appointment
- Newsletter: use `utm_source=email&utm_medium=email&utm_campaign=<newsletter_name>` and replace `<newsletter_name>` with a short lowercase campaign name.

## SMS

- General: https://celestialdental.org/?utm_source=sms&utm_medium=messaging&utm_campaign=patient_message
- Appointment: https://celestialdental.org/?book=1&utm_source=sms&utm_medium=messaging&utm_campaign=appointment
- Reminder: https://celestialdental.org/?utm_source=sms&utm_medium=messaging&utm_campaign=appointment_reminder

## Influencer campaign (braces)

Don't hand-write these — one typo and a creator's traffic splits into two rows
that never add up:

```
node influencer-links.mjs nasra brenda kevo
node influencer-links.mjs nasra brenda --csv > campaign-links.csv
```

The convention it emits, and the reason for each part:

- `utm_medium=influencer` — deliberately **not** `social`, so partner traffic
  reports separately from organic Instagram/TikTok.
- `utm_campaign=braces_2026` — one value for the whole campaign.
- `utm_content=<handle>` — the individual creator. Lowercase, no `@`. This is
  the field every per-creator report groups by.
- `?via=<handle>` — short form for anywhere a full UTM string is impractical
  (print, chair-side cards, a spoken URL). Equivalent to `utm_content`.

The same handle must appear in all three places or a creator gets counted
twice under different names:

| Where | Form | Example |
|---|---|---|
| Link | `utm_content` | `utm_content=nasra` |
| WhatsApp prefill | `Code: NAME` | `Code: NASRA` |
| Spoken / walk-in | `mention NAME` | "mention NASRA at reception" |

What each one feeds:

- **Clicks** → admin Analytics → "Campaign performance — by creator" (distinct
  visitors, last 30 days), and GA4 under source/medium `instagram / influencer`.
- **Online bookings** → Appointments sheet: `Source` column gets
  `instagram/influencer/braces_2026/nasra`, `Referral` gets `Influencer: NASRA`.
  Attribution is **first touch**, remembered for 90 days, so the creator who
  introduced the patient keeps the credit.
- **WhatsApp chats** → the code is appended to the prefilled message
  automatically on any wa.me link once the visitor arrived on a tagged link.
- **Walk-ins** → reception writes the code on the patient file. This is the
  only path with no automatic capture, and for braces it's the biggest one.

## Reporting convention

- `utm_source`: platform sending the visitor, such as `whatsapp`, `instagram`, `facebook`, `google`, `email`, or `sms`.
- `utm_medium`: channel category: `messaging`, `social`, `organic`, or `email`.
- `utm_campaign`: placement or purpose, such as `profile`, `appointment`, `status`, or the branch-specific Google Business campaign.
- Keep all values lowercase and use underscores instead of spaces.
