# Website remediation — status

Against `Celestial-Dental-Website-Remediation.pdf` (audit of 16 September 2026).

**Branch:** `compliance/advertising-remediation-2026-09`
**Staging:** https://celestial-dental-centre-lfcfvr8cq-joshua-musaus-projects.vercel.app
(Vercel preview, behind your Vercel SSO — sign in to view. Production is untouched.)

---

## The thing that changes how you read the rest of this

**Most of what the audit found was not in the repo. It was in the Google Sheet.**

The homepage reads `/api/site-data`, and when a section has rows there they replace the
vetted defaults in `site.ts` wholesale. The "Dr. Belinda" review, the "5 min target
response time" stat, the "4 accessible branches" count, the real patient names and the
outcome-promise service copy were all live from the sheet. Editing the code alone would
have changed nothing on the live site.

So `hero`, `stats`, `testimonials`, `about`, `services` and `whyChooseUs` now render from
code and ignore the sheet (`src/data/siteData.ts`). **Consequence you need to pass on to
whoever uses the admin portal: edits to those sections still save, but no longer appear on
the site.** Changing that copy — including adding or renaming a service — is now a code
change. Gallery, insurers, team, branches, blog and careers are unaffected and still fully
editable.

---

## Done

| # | Item | Where |
|---|---|---|
| P1-1 | Patient testimonials removed entirely | Hero card (mobile + desktop) and the data |
| P1-1 | **Google Reviews section also removed** | It carried the "Dr. Belinda" quote independently — see note below |
| P1-2 | "Fast response guaranteed" dropped | Homepage + branch page CTAs |
| P1-3 | "5 min target response time" gone | Stat tile and the booking FAQ answer |
| P1-4 | Mission rewritten, vision dropped | "highest quality", "state-of-the-art", "centre of excellence", "regional leader" |
| P1-5 | Hero states name, branches, hours | Replaces "Trusted dental care, close to you." |
| P1-6 | Service copy describes the appointment | whitening, implants, fillings, cosmetic |
| P3 | Branch count derived from the branch list | Can no longer disagree with the cards beside it |
| P3 | Addresses reconciled, "Busines" typo fixed | In the repo — see sheet cleanup below |
| P3 | "20+ years of service" removed | Unevidenced, and the seed copy said "over fifteen" |
| P4 | Every booking appeal relabelled | Booking itself unchanged |
| P5 | Insurance panel neutralised | Logos kept as payment info; "We bill 20+ major schemes directly" gone |
| P5 | Cookie banner names retargeting plainly | Was "helpful dental care reminders" |
| P5 | "Your smile matters" no longer standalone footer copy | |

Verified by rendering the built branch against the **live** CMS (the preview server proxies
`/api` to production): all twenty flagged strings absent from the homepage, About and a
service page. Typecheck and build clean, PHP lints clean.

### The Google Reviews section

The audit named the hero "Loved by patients" block. Removing it was not enough — rendering
the branch showed the "Dr. Belinda" quote still on the homepage, from a second section fed
separately by `/api/content?resource=google-reviews`. The existing anonymised byline
("Verified Google review") does not cure it: the quote bodies are patient testimony, and
that quote applies "Dr." to a person whose cadre is not stated, which is the representation
the ruling turned on. I removed the section. The branch-page cards that *invite* patients
to leave a Google review are untouched.

---

## Blocked

**Priority 2, the practitioner block.** `content-calendar/verified-fact-sheet.md` is
completely blank — no cadres, no registration numbers, no qualifications for any of the
five names. I will not invent them.

In the meantime the individual team cards are hidden behind `practitionersVerified` in
`src/pages/AboutPage.tsx:54`, rather than publishing bare names alongside advertised
procedures. The group photographs stay; they make no claim about a named individual.
Flip that flag when each card renders a completed register row.

**One deviation from the audit, deliberate.** The audit asks for the line "Our practitioners
are registered with the Kenya Medical Practitioners and Dentists Council. Registration can
be verified at registers.kmpdc.go.ke." I have not added it — you have a standing instruction
that the Council is not to be named or linked anywhere on the site, and it has been removed
twice before. If you want the registration numbers published without naming the regulator,
a neutral label ("Practitioner registration 12345") does that. Your call.

---

## Still needs a person

**Decisions I made that you may want to reverse.** All are one-line changes:
- Insurance panel kept as payment information rather than deleted. The audit left this to
  the reviewer; the fact sheet lists insurance partners under "deliberately excluded".
- "20+ years of service" removed rather than evidenced.
- Footer "Built by MusauCreative" left exactly as it was.

**Admin sheet cleanup — code cannot reach these:**
- Kamakis address still reads "Viashla **Busines** Centre" live, and has no town line.
- Eldoret branch tagline is still "Trusted dental care in the heart of Eldoret".
- The `hero`, `stats`, `testimonials` and `team` rows are now ignored by the site but still
  sit in the sheet. Worth clearing so the portal stops showing copy that does not publish.

**Facts only you can settle:**
- **Telephone.** The site publishes three branch numbers; the kit's fact sheet says the
  published contact is 0709 000 240. Unreconciled — I changed nothing.
- **Branch count.** Derived as three from the live branch list. If Thindigua is a real
  fourth branch it belongs in the branch data, not in a stat tile.
- Retargeting creative currently running needs checking against Rule 4(1).
- Google Business Profile and social bios need the same addresses as the site.

---

## Deploying this for real

Staging above is a Vercel preview. **The live site is not on Vercel** — celestialdental.org
is served from cPanel, and Vercel only runs `/api`. Promoting this means:

1. **Frontend → cPanel.** Build and ship `dist/` to `public_html`, including
   `prerender.php`, `crawl.html` and `blog-feed.php`, which all carry copy changes here.
2. **API → Vercel.** `npx vercel --prod` for `api/faqs.ts`, `api/site-data.ts`,
   `api/branches.ts`.
3. Then the sheet cleanup above, then re-audit against `COMPLIANCE_AUDIT.md` section 10
   and record the sign-off.
