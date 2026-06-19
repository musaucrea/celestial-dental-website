import { ArrowRight, MessageCircle, Star, Clock, ShieldCheck } from 'lucide-react';
import { heroPills, site, stats } from '../data/site';
import { useBooking } from './booking';
import { Reveal } from './Reveal';
import { useRef } from 'react';

// Swap this for a self-hosted /videos/hero.mp4 whenever ready
const HERO_VIDEO =
  'https://videos.pexels.com/video-files/6823562/6823562-hd_1920_1080_25fps.mp4';
const HERO_POSTER = '/facility/reception-lounge.jpg';

export function Hero() {
  const { openBooking } = useBooking();
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden"
    >
      {/* ── Video background ─────────────────────────────── */}
      <video
        ref={videoRef}
        src={HERO_VIDEO}
        poster={HERO_POSTER}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
      />

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
                Kasarani · Kamakis · Eldoret
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-5 text-[2.6rem] font-900 leading-[1.02] text-white sm:text-6xl lg:text-[4.4rem]">
                Trusted dental care,{' '}
                <span className="bg-gradient-to-r from-brand-300 to-brand-400 bg-clip-text text-transparent">
                  close to you.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
                Calm, modern dental care for every smile — children, adults, and families — in a
                welcoming clinic built around comfort and clarity.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <ul className="mt-7 flex flex-wrap gap-2.5">
                {heroPills.map((pill) => (
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
                  href={`${site.whatsappHref}?text=Hi%2C%20I%27d%20like%20to%20talk%20to%20a%20dentist.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-base font-800 text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <MessageCircle className="h-5 w-5" strokeWidth={2.2} />
                  Talk to a dentist
                </a>
              </div>
            </Reveal>

            <Reveal delay={340}>
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="font-display text-3xl font-900 text-brand-300">{s.value}</div>
                    <div className="text-sm font-medium text-white/55">{s.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Floating info cards (replaces the static photo on video hero) */}
          <Reveal delay={200} className="hidden lg:flex flex-col gap-4 items-end">

            {/* Rating card */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 py-4 shadow-card backdrop-blur-md animate-float-slow">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-400/20 text-gold-400">
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
