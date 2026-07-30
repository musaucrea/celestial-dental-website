import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { upload } from '@vercel/blob/client';
import {
  Mail, MessageCircle, MapPin, Briefcase, Clock, ArrowLeft, ChevronRight,
  ChevronDown, CalendarClock, Check, X, UploadCloud, FileText, CheckCircle2,
  AlertCircle, LoaderCircle,
} from 'lucide-react';
import { careers, site } from '../data/site';
import { parseJobDescription, jobPreview } from '../lib/jobDescription';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import { BookingProvider } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { SchemaOrg } from '../components/SchemaOrg';
import { SEO } from '../components/SEO';

type ApiOpening = {
  id: string; status: string; title: string;
  type: string; location: string; description: string;
  image?: string;
};

const GENERAL_ROLE_ID = 'general-application';
const MAX_RESUME_BYTES = 4 * 1024 * 1024;

type ApplicationModalProps = {
  openings: ApiOpening[];
  initialRoleId: string;
  onClose: () => void;
};

function safeResumeName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(-100) || 'resume.pdf';
}

function ApplicationModal({ openings, initialRoleId, onClose }: ApplicationModalProps) {
  const titleId = useId();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState(initialRoleId);
  const [noticePeriod, setNoticePeriod] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [resume, setResume] = useState<File | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ emailSent: boolean } | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose, submitting]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!resume) {
      setError('Please attach your resume as a PDF.');
      return;
    }
    if (!resume.name.toLowerCase().endsWith('.pdf') || (resume.type && resume.type !== 'application/pdf')) {
      setError('Only PDF resumes are accepted.');
      return;
    }
    if (resume.size > MAX_RESUME_BYTES) {
      setError('Your resume must be 4 MB or smaller.');
      return;
    }

    setSubmitting(true);
    try {
      const fileHeader = new Uint8Array(await resume.slice(0, 5).arrayBuffer());
      if (String.fromCharCode(...fileHeader) !== '%PDF-') {
        throw new Error('This file does not appear to be a valid PDF.');
      }
      const filename = safeResumeName(resume.name);
      // The shared blob store is public, so resumes get an unguessable URL
      // (addRandomSuffix) rather than signed access.
      const blob = await upload(`career-resumes/${Date.now()}-${filename}`, resume, {
        access: 'public',
        handleUploadUrl: '/api/careers?section=resume',
        contentType: 'application/pdf',
      });
      const response = await fetch('/api/careers?section=applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          fullName,
          email,
          phone,
          roleId,
          noticePeriod,
          salaryExpectation,
          coverLetter,
          resumeUrl: blob.url,
          resumeName: filename,
          termsAccepted,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'We could not submit your application.');
      setSuccess({ emailSent: Boolean(data.applicantEmailSent) });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not submit your application.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={event => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-float sm:max-w-2xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-brand-100 bg-white/95 px-6 py-5 backdrop-blur sm:px-8">
          <div>
            <p className="text-xs font-800 uppercase tracking-widest text-brand-600">Careers</p>
            <h2 id={titleId} className="mt-1 text-2xl font-900 text-ink-900">
              {success ? 'Application received' : 'Apply to join our team'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close application form"
            className="rounded-full p-2 text-ink-500 transition-colors hover:bg-brand-50 hover:text-ink-900 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-12 text-center sm:px-10">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 className="h-9 w-9" />
            </span>
            <h3 className="mt-5 text-2xl font-900 text-ink-900">Thank you, {fullName.split(' ')[0]}.</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
              Your application has been sent to our HR team for review.
              {/* Only worth mentioning the confirmation email when it failed —
                  otherwise the applicant will simply see it arrive. */}
              {!success.emailSent
                && ' HR has your application, although the confirmation email could not be delivered.'}
            </p>
            <button type="button" onClick={onClose} className="btn-primary mt-7">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-7 sm:px-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-800 text-ink-800">
                <span>Full name *</span>
                <input
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={event => setFullName(event.target.value)}
                  className="w-full rounded-xl border border-brand-100 px-4 py-3 font-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Your full name"
                />
              </label>
              <label className="space-y-2 text-sm font-800 text-ink-800">
                <span>Email address *</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-brand-100 px-4 py-3 font-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="you@example.com"
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-800 text-ink-800">
                <span>Phone number *</span>
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={event => setPhone(event.target.value)}
                  className="w-full rounded-xl border border-brand-100 px-4 py-3 font-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Your phone number"
                />
              </label>
              <label className="space-y-2 text-sm font-800 text-ink-800">
                <span>Role you are applying for *</span>
                <select
                  required
                  value={roleId}
                  onChange={event => setRoleId(event.target.value)}
                  className="w-full rounded-xl border border-brand-100 bg-white px-4 py-3 font-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Choose a role</option>
                  {openings.map(opening => (
                    <option key={opening.id} value={opening.id}>{opening.title}</option>
                  ))}
                  <option value={GENERAL_ROLE_ID}>General / Speculative Application</option>
                </select>
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-800 text-ink-800">
                <span>Notice period *</span>
                <select
                  required
                  value={noticePeriod}
                  onChange={event => setNoticePeriod(event.target.value)}
                  className="w-full rounded-xl border border-brand-100 bg-white px-4 py-3 font-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Choose your notice period</option>
                  {['Immediately', '1 week', '2 weeks', '1 month', '2 months', '3 months or more'].map(period => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-800 text-ink-800">
                <span>Expected monthly salary *</span>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={salaryExpectation}
                  // Digits only, formatted with thousands separators as they type.
                  // No figure is suggested — the applicant names their own.
                  onChange={event => {
                    const digits = event.target.value.replace(/[^\d]/g, '').slice(0, 9);
                    setSalaryExpectation(digits ? Number(digits).toLocaleString('en-KE') : '');
                  }}
                  className="w-full rounded-xl border border-brand-100 px-4 py-3 font-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  placeholder="Kenyan Shillings"
                />
              </label>
            </div>

            <label className="block space-y-2 text-sm font-800 text-ink-800">
              <span>Resume (PDF, maximum 4 MB) *</span>
              <span className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 px-4 py-4 transition hover:border-brand-500 hover:bg-brand-50">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
                  {resume ? <FileText className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-800 text-ink-800">
                    {resume ? resume.name : 'Choose your PDF resume'}
                  </span>
                  <span className="block text-xs font-500 text-ink-500">
                    {resume ? `${(resume.size / 1024 / 1024).toFixed(2)} MB` : 'Click to browse your device'}
                  </span>
                </span>
                <input
                  required
                  type="file"
                  accept=".pdf,application/pdf"
                  className="sr-only"
                  onChange={event => setResume(event.target.files?.[0] || null)}
                />
              </span>
            </label>

            <label className="block space-y-2 text-sm font-800 text-ink-800">
              <span>Cover letter <span className="font-500 text-ink-400">(optional)</span></span>
              <textarea
                value={coverLetter}
                onChange={event => setCoverLetter(event.target.value)}
                rows={5}
                maxLength={5000}
                className="w-full resize-y rounded-xl border border-brand-100 px-4 py-3 font-500 leading-relaxed outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder="Tell us briefly why you are interested in this role."
              />
            </label>

            <label className="flex items-start gap-3 rounded-2xl bg-mint p-4 text-sm leading-relaxed text-ink-600">
              <input
                required
                type="checkbox"
                checked={termsAccepted}
                onChange={event => setTermsAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
              />
              <span>
                I confirm that the information I have provided is accurate and I authorize Celestial Dental Centre
                to use my application data for recruitment. I understand that my information may be retained for
                up to 12 months, submission does not guarantee employment, and I may request access or deletion by
                emailing <a className="font-800 text-brand-700 underline" href={careers.emailHref}>{careers.email}</a>.
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-700 text-red-700" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-brand-100 pt-5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary min-w-40 justify-center disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    Submit application
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Renders plain copy, turning any email address in it into a mailto link. */
function LinkedText({ text }: { text: string }) {
  const parts = text.split(/([\w.+-]+@[\w-]+\.[\w.-]+\w)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^[\w.+-]+@[\w-]+\.[\w.-]+\w$/.test(part) ? (
          <a
            key={i}
            href={`mailto:${part}`}
            className="font-700 text-brand-600 underline underline-offset-2 hover:text-brand-800"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function MetaChip({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-700 text-brand-800">
      <Icon className="h-3.5 w-3.5 text-brand-500" />
      {children}
    </span>
  );
}

/** Sections that read as prose — bullet ticks would look odd against them. */
const proseSection = /how to apply|application (?:process|deadline)|about|summary|purpose|overview|remuneration|reporting to/i;

function isProse(title: string) {
  return proseSection.test(title);
}

/** `wide` lays the card out side by side — used when a single opening would
 *  otherwise sit alone in half a row. */
function JobCard({
  job,
  wide = false,
  onApply,
}: {
  job: ApiOpening;
  wide?: boolean;
  onApply: (roleId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const parsed = useMemo(() => parseJobDescription(job.description), [job.description]);
  const preview = jobPreview(parsed);
  const hasDetails = parsed.sections.length > 0 || preview.length > 180;

  return (
    <article
      className={`flex h-full overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-card transition-shadow hover:shadow-float ${
        wide ? 'flex-col sm:flex-row' : 'flex-col'
      }`}
    >
      <div className={`relative ${wide ? 'sm:w-2/5 sm:shrink-0' : ''}`}>
        {job.image ? (
          <img
            loading="lazy"
            decoding="async"
            src={job.image}
            alt=""
            className={`w-full object-cover ${wide ? 'aspect-[16/9] sm:absolute sm:inset-0 sm:h-full sm:aspect-auto' : 'aspect-[16/9]'}`}
          />
        ) : (
          <div
            className={`flex w-full items-center justify-center bg-gradient-to-br from-brand-50 via-mint to-gold-300/20 ${
              wide ? 'aspect-[16/9] sm:absolute sm:inset-0 sm:h-full sm:aspect-auto' : 'aspect-[16/9]'
            }`}
          >
            <Briefcase className="h-10 w-10 text-brand-300" />
          </div>
        )}
        {job.type && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-800 text-brand-800 shadow-sm backdrop-blur">
            <Briefcase className="h-3.5 w-3.5 text-brand-500" />
            {job.type}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h3 className="text-xl font-800 leading-snug text-ink-900">{job.title}</h3>

        {(job.location || parsed.deadline) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {job.location && <MetaChip icon={MapPin}>{job.location}</MetaChip>}
            {parsed.deadline && <MetaChip icon={CalendarClock}>Apply by {parsed.deadline}</MetaChip>}
          </div>
        )}

        {/* Once expanded, a teaser built from the first section would just repeat it. */}
        {preview && (!open || parsed.summary) && (
          <p className={`mt-4 text-sm leading-relaxed text-ink-500 ${open ? '' : 'line-clamp-3'}`}>
            {preview}
          </p>
        )}

        {open && parsed.sections.length > 0 && (
          <div id={detailsId} className="mt-6 space-y-6 border-t border-brand-100 pt-6">
            {parsed.sections.map(section => (
              <div key={section.title}>
                <h4 className="text-xs font-800 uppercase tracking-widest text-brand-600">
                  {section.title}
                </h4>
                {section.items.length > 1 && !isProse(section.title) ? (
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                        <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-500" />
                        <span><LinkedText text={item} /></span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-3 space-y-2 text-sm leading-relaxed text-ink-700">
                    {section.items.map((item, i) => (
                      <p key={i}><LinkedText text={item} /></p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
          <button
            type="button"
            onClick={() => onApply(job.id)}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-800 text-white transition-colors hover:bg-brand-700"
          >
            Apply for this role
            <ChevronRight className="h-4 w-4" />
          </button>
          {hasDetails && (
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              aria-expanded={open}
              aria-controls={detailsId}
              className="inline-flex items-center gap-1.5 text-sm font-800 text-brand-600 transition-colors hover:text-brand-800"
            >
              {open ? 'Show less' : 'View full details'}
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function CareersPageInner() {
  const [apiOpenings, setApiOpenings] = useState<ApiOpening[] | null>(null);
  const [applicationRoleId, setApplicationRoleId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/careers')
      .then(r => r.ok ? r.json() : null)
      .then(data => setApiOpenings(data?.openings || []))
      .catch(() => setApiOpenings([]));
  }, []);

  const openings = apiOpenings ?? [];
  const loaded = apiOpenings !== null;

  return (
    <>
      <SEO
        title={`Dental Careers in Kenya | ${site.name}`}
        description="Explore dental career opportunities at Celestial Dental Centre in Kasarani, Kamakis, and Eldoret. Send your CV for clinical, patient care, and support roles."
        image="/team/clinical-team.jpg"
        canonicalPath="/careers"
        keywords={['dental jobs Kenya', 'dentist careers Nairobi', 'Celestial Dental careers']}
      />
      <SchemaOrg />
      <Header />
      <main className="pt-28">

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-gold-50 py-16 lg:py-24">
          <div className="container-page">
            <Reveal>
              <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-800 mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Link>
            </Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="max-w-2xl">
                <Reveal>
                  <span className="eyebrow">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                    Careers
                  </span>
                </Reveal>
                <Reveal delay={80}>
                  <h1 className="mt-4 text-4xl lg:text-5xl font-900 text-ink-900 leading-tight">
                    Build your career with a team that <span className="text-brand-600">cares</span>
                  </h1>
                </Reveal>
                <Reveal delay={120}>
                  <p className="mt-5 text-lg text-ink-500 leading-relaxed">{careers.intro}</p>
                </Reveal>
                <Reveal delay={160}>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setApplicationRoleId(GENERAL_ROLE_ID)} className="btn-primary">
                      <Mail className="h-4 w-4" />
                      Apply now
                    </button>
                    <a
                      href={site.whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message us
                    </a>
                  </div>
                </Reveal>
              </div>
              <Reveal delay={200}>
                <div className="w-full">
                  <img
                    src="/team/clinical-team.jpg"
                    alt="The Celestial Dental clinical team"
                    loading="eager"
                    className="aspect-[4/3] w-full rounded-3xl border border-brand-100 object-cover object-center shadow-card"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Why work with us */}
        <section className="py-20 lg:py-28 bg-mint">
          <div className="container-page">
            <Reveal>
              <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Why work with us</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">A place to do your best work</h2>
            </Reveal>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {careers.perks.map((p, i) => (
                <Reveal key={p.title} delay={i * 80}>
                  <div className="rounded-3xl border border-brand-100 bg-white p-7 shadow-card">
                    <span className="eyebrow text-gold-600">{p.tag}</span>
                    <h3 className="mt-3 text-xl font-800 text-ink-900">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-500">{p.description}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Open positions */}
        <section className="py-20 lg:py-28">
          <div className="container-page">
            <Reveal>
              <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Open positions</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">Current openings</h2>
            </Reveal>
            {loaded && openings.length === 0 && (
              <Reveal delay={120}>
                <div className="mt-12 rounded-3xl border border-brand-100 bg-white p-10 text-center shadow-card">
                  <p className="text-lg font-800 text-ink-900">There are no open positions at the moment.</p>
                  <p className="mt-2 text-sm text-ink-500">
                    Check back soon — new roles are posted here as they open up.
                  </p>
                </div>
              </Reveal>
            )}
            <div className={`mt-12 grid items-start gap-6 ${openings.length > 1 ? 'lg:grid-cols-2' : ''}`}>
              {openings.map((job, i) => (
                <Reveal key={job.id} delay={i * 80}>
                  <JobCard job={job} wide={openings.length === 1} onApply={setApplicationRoleId} />
                </Reveal>
              ))}
            </div>

            <Reveal delay={120}>
              <p className="mt-10 text-sm text-ink-500">
                Don't see your role? We're always glad to meet talented people.{' '}
                <button
                  type="button"
                  onClick={() => setApplicationRoleId(GENERAL_ROLE_ID)}
                  className="font-800 text-brand-600 transition-colors hover:text-brand-800"
                >
                  Send us a speculative application →
                </button>
              </p>
            </Reveal>
          </div>
        </section>

        {/* How to apply CTA */}
        <section className="py-20 lg:py-28 bg-mint">
          <div className="container-page max-w-3xl">
            <Reveal>
              <div className="rounded-3xl bg-brand-700 p-8 lg:p-12 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-800 uppercase tracking-widest text-brand-200">
                  <Clock className="h-3.5 w-3.5" />
                  We review applications weekly
                </span>
                <h3 className="mt-3 text-2xl lg:text-3xl font-900 text-white">Ready to apply?</h3>
                <p className="mt-2 text-sm text-brand-200">
                  Complete our secure application form with your CV, availability and an optional cover letter.
                  Our HR team will confirm receipt by email.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setApplicationRoleId(GENERAL_ROLE_ID)}
                    className="btn-primary bg-white !text-brand-800 !shadow-none hover:!shadow-none"
                  >
                    <Mail className="h-4 w-4" />
                    Start application
                  </button>
                  <a
                    href={site.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost !text-white !border-white/30 !bg-white/10"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp us
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-ink-900 text-white py-12">
        <div className="container-page">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <img src={site.logo} alt={site.name} className="h-10 w-auto brightness-0 invert" />
              <p className="mt-2 text-sm text-white/50">{site.tagline}</p>
            </div>
            <div className="text-sm text-white/50 text-center sm:text-right">
              <p>{site.hours}</p>
              <p className="mt-1">{site.email}</p>
              <p className="mt-1">&copy; {new Date().getFullYear()} {site.name}. Built by MusauCreative.</p>
            </div>
          </div>
        </div>
      </footer>

      <BookingModal />
      {applicationRoleId && (
        <ApplicationModal
          openings={openings}
          initialRoleId={applicationRoleId}
          onClose={() => setApplicationRoleId(null)}
        />
      )}
    </>
  );
}

export function CareersPage() {
  return (
    <BookingProvider>
      <CareersPageInner />
    </BookingProvider>
  );
}
