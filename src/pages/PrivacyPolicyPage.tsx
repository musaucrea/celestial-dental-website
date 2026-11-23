import { Header } from '../components/Header';
import { BookingProvider } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { SEO } from '../components/SEO';
import { SiteFooter } from '../components/SiteFooter';
import { site } from '../data/site';
// Same file that public/prerender.php reads for crawlers, so the policy
// visitors see and the policy search engines index can never drift apart.
import policy from '../../public/legal/privacy-policy.json';

type Section = { heading: string; paragraphs?: string[]; bullets?: string[] };

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Turns the plain email address in the policy text into a mail link. */
function withEmailLink(text: string) {
  const parts = text.split(site.email);
  return parts.flatMap((part, i) =>
    i === 0 ? [part] : [<a key={i} href={site.emailHref} className="text-brand-600 underline">{site.email}</a>, part],
  );
}

export function PrivacyPolicyPage() {
  return (
    <BookingProvider>
      <SEO
        title={`Privacy Policy | ${site.name}`}
        description="How Celestial Dental Centre collects, uses, shares and protects personal information submitted through celestialdental.org, and your rights under Kenya's Data Protection Act, 2019."
        canonicalPath="/privacy-policy"
      />
      <Header />
      <main className="container-page pt-32 pb-20">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-800 text-secondary-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-secondary-500">Last updated {formatDate(policy.updated)}</p>
          <p className="mt-6 text-secondary-700 leading-relaxed">{policy.intro}</p>
          {(policy.sections as Section[]).map(section => (
            <section key={section.heading} className="mt-10">
              <h2 className="text-xl font-800 text-secondary-900">{section.heading}</h2>
              {section.bullets && (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-secondary-700 leading-relaxed">
                  {section.bullets.map(b => <li key={b}>{withEmailLink(b)}</li>)}
                </ul>
              )}
              {section.paragraphs?.map(p => (
                <p key={p} className="mt-3 text-secondary-700 leading-relaxed">{withEmailLink(p)}</p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
      <BookingModal />
    </BookingProvider>
  );
}
