import { ArrowRight, Star, Clock, ShieldCheck } from 'lucide-react';
import { heroPills, site, stats as staticStats, testimonials as staticTestimonials, gallery as staticGallery } from '../data/site';
import { useBooking } from './booking';
import { useSection } from '../data/siteData';
import { Reveal } from './Reveal';
import { WhatsAppIcon } from './icons';
import { useEffect, useState } from 'react';

type HeroContent = {
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  pills: string;
  /** Optional dedicated slideshow photos, one URL per line. Falls back to the gallery. */
  slides?: string;
};

const defaultHero: HeroContent = {
  eyebrow: 'Kasarani · Kamakis · Eldoret · Kiambu Road',
  title: 'Trusted dental care,',
  highlight: 'close to you.',
  subtitle:
    'Calm, modern dental care for every smile — children, adults, and families — in a welcoming clinic built around comfort and clarity.',
  pills: heroPills.join(', '),
  slides: '/facility/reception-lounge.jpg\n/team/clinical-team.jpg\n/facility/waiting-area.jpg\n/team/patient-care-team.jpg\n/facility/childrens-treatment-room.jpg\n/facility/clinic-hallway.jpg',
};

const SLIDE_INTERVAL_MS = 6000;

export function Hero() {
  const { openBooking } = useBooking();
  const hero = useSection<HeroContent>('hero', [defaultHero])[0] ?? defaultHero;
  const stats = useSection<{ value: string; label: string }>('stats', staticStats);
  const pills = (hero.pills || '').split(',').map(p => p.trim()).filter(Boolean);

  // Background slideshow: dedicated hero slides if set, otherwise the gallery photos.
  const galleryImages = useSection<{ src: string }>('gallery', staticGallery).map(g => g.src);
  const dedicated = (hero.slides || '').split('\n').map(s => s.trim()).filter(Boolean);
  const slides = dedicated.length ? dedicated : galleryImages;
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    setSlideIdx(0);
  }, [slides.length, slides[0]]);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => setSlideIdx(i => (i + 1) % slides.length), SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Patient stories rotate one at a time: pop in, hold ~7s, fade out.
  const managedStories = useSection<{ quote: string; author: string; stars?: number | string }>(
    'testimonials',
    staticTestimonials,
  );
  // Admin-managed sheet values can arrive as strings. Only rotate complete,
  // explicitly five-star patient stories; fall back to the verified local set.
  const stories = managedStories.filter(
    story => Number(story.stars) === 5 && story.quote?.trim() && story.author?.trim(),
  );
  const [storyIdx, setStoryIdx] = useState(0);
  useEffect(() => {
    if (stories.length < 2) return;
    const timer = setInterval(() => setStoryIdx(i => (i + 1) % stories.length), 7000);
    return () => clearInterval(timer);
  }, [stories.length]);
  const story = stories[storyIdx % Math.max(stories.length, 1)];
  const storyQuote = story && story.quote.length > 130 ? `${story.quote.slice(0, 127)}…` : story?.quote;

  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
    >
      {/* ── Image slideshow background (crossfade + slow zoom) ── */}
      <div className="absolute inset-0" aria-hidden="true">
        {slides.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt={`Celestial Dental Centre clinic interior — ${site.name}`}
            loading="eager"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1500ms] ease-in-out ${
              i === slideIdx % slides.length ? 'opacity-100 hero-kenburns' : 'opacity-0'
            }`}
          />
        ))}
      </div>

      {/* ── Overlays ──────────────────────────────────────── */}
      {/* Deep gradient: dark at top & bottom, slightly lighter in center */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/75" />
      {/* Subtle teal tint to keep brand feel */}
      <div className="absolute inset-0 bg-brand-950/30" />

      {/* ── Content ───────────────────────────────────────── */}
      <div className="container-page relative z-10 pt-32 pb-20 sm:pt-36 lg:pt-40 lg:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">

          {/* Copy */}
          <div>
            <Reveal>
              <span className="eyebrow !text-brand-300">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                {hero.eyebrow}
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-5 text-[2.6rem] font-900 leading-[1.02] text-white sm:text-6xl lg:text-[4.4rem]">
                {hero.title}{' '}
                <span className="bg-gradient-to-r from-brand-300 to-brand-400 bg-clip-text text-transparent">
                  {hero.highlight}
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
                {hero.subtitle}
              </p>
            </Reveal>

            <Reveal delay={220}>
              <ul className="mt-7 flex flex-wrap gap-2.5">
                {pills.map((pill) => (
                  <li
                    key={pill}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm"
                  >
                    {pill}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={280}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button onClick={() => openBooking()} className="btn-primary text-base">
                  Book Appointment
                  <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
                </button>
                <a
                  href={`${site.whatsappHref}?text=${encodeURIComponent("Hi, I'd like to talk to a dentist at Celestial Dental Centre.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-base font-800 text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  Talk to a dentist
                </a>
              </div>
            </Reveal>

            <Reveal delay={340}>
              <div className="mt-10 flex flex-wrap items-stretch gap-3">
                {stats.map((s, i) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3.5 shadow-card backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-300/50 hover:bg-white/15 animate-float-slow"
                    style={{ animationDelay: `${i * 0.8}s` }}
                  >
                    <div className="font-display text-3xl font-900 bg-gradient-to-r from-brand-300 to-gold-300 bg-clip-text text-transparent">
                      {s.value}
                    </div>
                    <div className="mt-0.5 text-[11px] font-800 uppercase tracking-wider text-white/60">{s.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Rotating patient story — mobile/tablet only (desktop shows it in the right rail) */}
            {story && (
              <Reveal delay={400} className="mt-8 lg:hidden">
                <div className="rounded-2xl border border-white/20 bg-ink-900/70 p-4 shadow-float backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5 text-gold-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-white/70">Loved by patients</span>
                  </div>
                  <div key={storyIdx} className="story-pop mt-3 border-t border-white/10 pt-3">
                    <p className="text-sm font-600 italic leading-relaxed text-white">"{storyQuote}"</p>
                    <p className="mt-1.5 text-xs font-800 text-brand-300">— {story.author}</p>
                  </div>
                </div>
              </Reveal>
            )}
          </div>

          {/* Floating info cards (replaces the static photo on video hero) */}
          <Reveal delay={200} className="hidden lg:flex flex-col gap-4 items-end">

            {/* Hours card */}
            <div
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 shadow-card backdrop-blur-md animate-float-slow"
              style={{ animationDelay: '1.5s' }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-400/20 text-brand-300">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-800 text-white">Open every day</div>
                <div className="text-xs font-medium text-white/60">07:00 – 20:00</div>
              </div>
            </div>

            {/* Safety chip */}
            <div
              className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-5 py-3 shadow-card backdrop-blur-md animate-float-slow"
              style={{ animationDelay: '3s' }}
            >
              <ShieldCheck className="h-4.5 w-4.5 text-brand-300" />
              <span className="text-sm font-bold text-white/80">Trusted sterilization standards</span>
            </div>

            {/* Rating + rotating patient story — one card */}
            <div className="w-80 rounded-2xl border border-white/20 bg-ink-900/80 p-4 shadow-float backdrop-blur-xl animate-float-slow">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/20 text-gold-400">
                  <Star className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <div className="flex gap-0.5 text-gold-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <div className="text-xs font-semibold text-white/70">Loved by patients</div>
                </div>
              </div>
              {story && (
                <div key={storyIdx} className="story-pop mt-3 border-t border-white/10 pt-3 min-h-[4.5rem]">
                  <p className="text-[13px] font-600 italic leading-relaxed text-white">"{storyQuote}"</p>
                  <p className="mt-1.5 text-xs font-800 text-brand-300">— {story.author}</p>
                </div>
              )}
            </div>

          </Reveal>
        </div>
      </div>

      {/* ── Scroll cue ────────────────────────────────────── */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 flex flex-col items-center gap-1.5 animate-bounce">
        <div className="h-8 w-[1.5px] rounded-full bg-white/30" />
        <span className="text-[10px] font-700 uppercase tracking-[0.2em] text-white/40">Scroll</span>
      </div>
    </section>
  );
}
