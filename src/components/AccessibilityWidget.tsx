import { useEffect, useState } from 'react';
import { Accessibility, X, Type, Contrast, Droplet, Link2, BookOpen, RotateCcw, Languages, Check, Volume2, Square } from 'lucide-react';

/* ── Languages offered (Google Translate codes) ────────────────── */
const LANGUAGES: { code: string; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'sw', label: 'Swahili', native: 'Kiswahili' },
  { code: 'fr', label: 'French', native: 'Français' },
  { code: 'zh-CN', label: 'Chinese', native: '中文' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'de', label: 'German', native: 'Deutsch' },
  { code: 'it', label: 'Italian', native: 'Italiano' },
  { code: 'pt', label: 'Portuguese', native: 'Português' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
];

const FONT_STEPS = ['100%', '112%', '125%', '140%'];
const STORAGE_KEY = 'cd_a11y';

// Map our language codes to speech-synthesis BCP-47 tags for the voice reader
const SPEECH_LANG: Record<string, string> = {
  en: 'en-US', sw: 'sw-KE', fr: 'fr-FR', 'zh-CN': 'zh-CN', es: 'es-ES',
  de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ar: 'ar-SA',
};

type Settings = { font: number; contrast: boolean; grayscale: boolean; links: boolean; readable: boolean };
const DEFAULTS: Settings = { font: 0, contrast: false, grayscale: false, links: false, readable: false };

function readCookieLang(): string {
  const m = document.cookie.match(/googtrans=\/[a-zA-Z-]+\/([a-zA-Z-]+)/);
  return m ? m[1] : 'en';
}

function applySettings(s: Settings) {
  const root = document.documentElement;
  root.style.fontSize = FONT_STEPS[s.font] || '100%';
  const filters: string[] = [];
  if (s.contrast) filters.push('contrast(1.4)');
  if (s.grayscale) filters.push('grayscale(1)');
  root.style.filter = filters.join(' ');
  root.classList.toggle('a11y-links', s.links);
  root.classList.toggle('a11y-readable', s.readable);
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'access' | 'lang'>('access');
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [lang, setLang] = useState('en');
  const [speaking, setSpeaking] = useState(false);

  // Restore saved accessibility settings + current language on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved) { setSettings({ ...DEFAULTS, ...saved }); applySettings({ ...DEFAULTS, ...saved }); }
    } catch { /* ignore */ }
    setLang(readCookieLang());
  }, []);

  // Load Google Translate once (drives the multi-language switching)
  useEffect(() => {
    if (document.getElementById('google-translate-script')) return;
    (window as unknown as { googleTranslateElementInit: () => void }).googleTranslateElementInit = () => {
      const g = (window as unknown as { google?: { translate?: { TranslateElement: new (o: object, id: string) => void } } }).google;
      if (g?.translate) {
        new g.translate.TranslateElement(
          { pageLanguage: 'en', includedLanguages: LANGUAGES.map(l => l.code).join(','), autoDisplay: false },
          'google_translate_element',
        );
      }
    };
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      applySettings(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const reset = () => {
    setSettings(DEFAULTS);
    applySettings(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  // Voice reader — reads the main page content aloud (Web Speech API)
  const toggleReadAloud = () => {
    const synth = window.speechSynthesis;
    if (!synth) { alert('Sorry, voice reading is not supported in this browser.'); return; }
    if (speaking) { synth.cancel(); setSpeaking(false); return; }
    const main = document.querySelector('main') as HTMLElement | null;
    const text = ((main?.innerText || document.body.innerText || '')).replace(/\s+/g, ' ').trim().slice(0, 32000);
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[lang] || 'en-US';
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  };

  // Stop any speech if the widget unmounts
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } }, []);

  const chooseLanguage = (code: string) => {
    const host = location.hostname;
    // Clear any existing translation cookie, then set the new one (or leave cleared for English)
    const expire = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
    document.cookie = `googtrans=; ${expire}; path=/;`;
    document.cookie = `googtrans=; ${expire}; path=/; domain=.${host};`;
    if (code !== 'en') {
      document.cookie = `googtrans=/en/${code}; path=/;`;
      document.cookie = `googtrans=/en/${code}; path=/; domain=.${host};`;
    }
    location.reload();
  };

  const toggleBtn = (active: boolean, onClick: () => void, Icon: typeof Type, label: string) => (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
        active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-brand-100 bg-white text-ink-700 hover:bg-brand-50'
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1">{label}</span>
      {active && <Check className="h-4 w-4 text-brand-600" />}
    </button>
  );

  return (
    <div className="a11y-widget notranslate" translate="no">
      {/* Hidden Google Translate mount point */}
      <div id="google_translate_element" style={{ display: 'none' }} />

      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Accessibility and language options"
        className="fixed bottom-5 left-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-float transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-300"
      >
        <Accessibility className="h-7 w-7" strokeWidth={2} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/20" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Accessibility and language settings"
            className="fixed bottom-24 left-5 z-[61] w-[min(92vw,360px)] max-h-[75vh] overflow-y-auto rounded-3xl border border-brand-100 bg-white p-5 shadow-float"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-900 text-ink-900">Accessibility</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-ink-400 hover:bg-brand-50 hover:text-ink-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-brand-50 p-1">
              <button
                onClick={() => setTab('access')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold transition ${tab === 'access' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500'}`}
              >
                <Accessibility className="h-4 w-4" /> Display
              </button>
              <button
                onClick={() => setTab('lang')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold transition ${tab === 'lang' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500'}`}
              >
                <Languages className="h-4 w-4" /> Language
              </button>
            </div>

            {tab === 'access' ? (
              <div className="mt-4 space-y-2.5">
                {/* Voice reader */}
                <button
                  onClick={toggleReadAloud}
                  aria-pressed={speaking}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                    speaking ? 'border-brand-500 bg-brand-600 text-white' : 'border-brand-100 bg-white text-ink-700 hover:bg-brand-50'
                  }`}
                >
                  {speaking ? <Square className="h-5 w-5 shrink-0" /> : <Volume2 className="h-5 w-5 shrink-0" />}
                  <span className="flex-1">{speaking ? 'Stop reading' : 'Read page aloud'}</span>
                </button>

                {/* Text size */}
                <div className="rounded-xl border border-brand-100 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Type className="h-5 w-5 shrink-0 text-ink-700" />
                    <span className="flex-1 text-sm font-bold text-ink-700">Text size</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => update({ font: Math.max(0, settings.font - 1) })}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-100 font-900 text-ink-700 hover:bg-brand-50"
                      aria-label="Decrease text size"
                    >A−</button>
                    <div className="flex flex-1 items-center gap-1">
                      {FONT_STEPS.map((_, i) => (
                        <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= settings.font ? 'bg-brand-500' : 'bg-brand-100'}`} />
                      ))}
                    </div>
                    <button
                      onClick={() => update({ font: Math.min(FONT_STEPS.length - 1, settings.font + 1) })}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-100 font-900 text-ink-700 hover:bg-brand-50"
                      aria-label="Increase text size"
                    >A+</button>
                  </div>
                </div>

                {toggleBtn(settings.contrast, () => update({ contrast: !settings.contrast }), Contrast, 'High contrast')}
                {toggleBtn(settings.grayscale, () => update({ grayscale: !settings.grayscale }), Droplet, 'Grayscale')}
                {toggleBtn(settings.links, () => update({ links: !settings.links }), Link2, 'Highlight links')}
                {toggleBtn(settings.readable, () => update({ readable: !settings.readable }), BookOpen, 'Readable font')}

                <button
                  onClick={reset}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-bold text-ink-500 hover:bg-brand-50"
                >
                  <RotateCcw className="h-4 w-4" /> Reset all
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <p className="mb-3 text-xs font-600 text-ink-500">Choose a language. The whole site is translated automatically.</p>
                <div className="grid grid-cols-1 gap-2">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => chooseLanguage(l.code)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                        lang === l.code ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-brand-100 bg-white text-ink-700 hover:bg-brand-50'
                      }`}
                    >
                      <span>{l.native} <span className="font-500 text-ink-400">· {l.label}</span></span>
                      {lang === l.code && <Check className="h-4 w-4 text-brand-600" />}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-ink-400">Translations are provided automatically by Google Translate and may not be perfect.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
