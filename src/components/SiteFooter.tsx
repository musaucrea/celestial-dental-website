import type { ComponentType } from 'react';
import { Phone, MessageCircle, Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import { WhatsAppIcon, TikTokIcon } from './icons';
import { useBooking } from './booking';
import { site, socials } from '../data/site';
import { useBranches } from '../data/branches';
import { useSection } from '../data/siteData';
import { PhoneLinks, phoneParts } from './PhoneLinks';

const SOCIAL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Facebook, Instagram, X: Twitter, LinkedIn: Linkedin, WhatsApp: WhatsAppIcon, TikTok: TikTokIcon,
};

/** Admin-editable footer content (SiteData sheet, section "footer"). */
type FooterContent = {
  blurb?: string;
  hours?: string;
  email?: string;
  phone?: string;
  facebook?: string;
  instagram?: string;
  x?: string;
  linkedin?: string;
  tiktok?: string;
  whatsapp?: string;
  tagline?: string;
};

const FOOTER_SOCIAL_FIELDS = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['x', 'X'],
  ['linkedin', 'LinkedIn'],
  ['tiktok', 'TikTok'],
  ['whatsapp', 'WhatsApp'],
] as const;

/**
 * Site-wide footer, shared by every page. Section links point at the
 * homepage ("/#services") so they work from any route.
 */
export function SiteFooter() {
  const { openBooking } = useBooking();
  const branches = useBranches();
  const fc = useSection<FooterContent>('footer', [])[0] ?? {};
  const overrides = FOOTER_SOCIAL_FIELDS
    .map(([key, label]) => ({ label, href: (fc[key] || '').trim() }))
    .filter(s => s.href);
  const footerSocials = overrides.length ? overrides : socials;
  const hoursLines = (fc.hours || '').split('\n').map(s => s.trim()).filter(Boolean);
  const email = (fc.email || '').trim() || site.email;
  const phone = (fc.phone || '').trim() || site.primaryPhone.label;
  const phoneHref = (fc.phone || '').trim()
    ? phoneParts(fc.phone!)[0].href
    : site.primaryPhone.href;
  const whatsappHref = (fc.whatsapp || '').trim() || site.whatsappHref;
  return (
    <footer className="bg-secondary-900 text-white">
      {/* Main footer grid */}
      <div className="container-page py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <img src={site.logo} alt={site.name} className="h-11 w-auto brightness-0 invert" />
            <p className="mt-3 text-sm leading-relaxed text-white/50 max-w-xs">
              {(fc.blurb || '').trim() || 'Calm, modern dental care for every smile — children, adults, and families.'}
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-800 text-white hover:bg-white/20 transition-colors"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              <a
                href={phoneHref}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-800 text-white hover:bg-white/20 transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                Call us
              </a>
            </div>
            {/* Social media */}
            <div className="mt-6">
              <p className="text-xs font-800 uppercase tracking-widest text-white/40 mb-3">Follow us</p>
              <div className="flex flex-wrap gap-2.5">
                {footerSocials.map(s => {
                  const Icon = SOCIAL_ICONS[s.label];
                  return (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand-500"
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : s.label[0]}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-800 uppercase tracking-widest text-white/40 mb-4">Quick links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Services', href: '/#services' },
                { label: 'Why Choose Us', href: '/#why' },
                { label: 'Our Branches', href: '/#branches' },
                { label: 'Gallery', href: '/#gallery' },
                { label: 'Blog', href: '/blog' },
                { label: 'Careers', href: '/careers' },
                { label: 'FAQ', href: '/#faq' },
              ].map(link => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Branches */}
          <div>
            <h4 className="text-xs font-800 uppercase tracking-widest text-white/40 mb-4">Our branches</h4>
            <ul className="space-y-4">
              {branches.map(b => (
                <li key={b.name}>
                  <p className="text-sm font-800 text-white">{b.name}</p>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{b.address[0]}</p>
                  <p className="text-xs text-brand-300 mt-0.5"><PhoneLinks phone={b.phone} className="hover:text-brand-200 transition-colors" /></p>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours & contact */}
          <div>
            <h4 className="text-xs font-800 uppercase tracking-widest text-white/40 mb-4">Hours & contact</h4>
            <div className="space-y-3 text-sm text-white/60">
              <div>
                <p className="font-800 text-white text-xs uppercase tracking-wide mb-1">Opening hours</p>
                {(hoursLines.length ? hoursLines : ['Monday – Sunday', '07:00 – 20:00']).map(line => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <div>
                <p className="font-800 text-white text-xs uppercase tracking-wide mb-1">Email</p>
                <a href={`mailto:${email}`} className="hover:text-white transition-colors">{email}</a>
              </div>
              <div>
                <p className="font-800 text-white text-xs uppercase tracking-wide mb-1">Phone</p>
                <p><PhoneLinks phone={phone} className="hover:text-white transition-colors" /></p>
              </div>
            </div>
            <button
              onClick={() => openBooking()}
              className="mt-6 btn-primary text-sm !px-5 !py-2.5 w-full justify-center"
            >
              <MessageCircle className="h-4 w-4" />
              Appointments
            </button>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-page py-5 flex flex-col items-center justify-center gap-1 text-center text-xs text-white/35">
          <p>&copy; {new Date().getFullYear()} {site.name}. Built by MusauCreative.</p>
        </div>
      </div>
    </footer>
  );
}
