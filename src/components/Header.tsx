import { useEffect, useRef, useState } from 'react';
import { Menu, Phone, X, ChevronDown } from 'lucide-react';
import { nav, site, services as staticServices, serviceSlug } from '../data/site';
import { useBranches } from '../data/branches';
import { useSection } from '../data/siteData';
import { WhatsAppIcon } from './icons';
import { Link } from 'react-router-dom';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Which mega-dropdown is open (by nav label), on desktop and on mobile
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileDropdown, setMobileDropdown] = useState<string | null>(null);
  const branches = useBranches();
  const services = useSection<{ title: string }>('services', staticServices);
  const branchLinks = branches.map(b => ({ label: b.name, href: `/branches/${b.slug}` }));
  const serviceLinks = services.map(s => ({ label: s.title, href: `/services/${serviceSlug(s.title)}` }));
  // Resolve a nav item's dropdown ('services' | 'branches') to its links + "view all" target
  const dropdownFor = (kind?: string) =>
    kind === 'services' ? { links: serviceLinks, viewAll: '/services' }
    : kind === 'branches' ? { links: branchLinks, viewAll: '/#branches' }
    : null;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={`container-page flex items-center justify-between rounded-full border px-3 py-2.5 transition-all duration-300 sm:px-4 ${
          scrolled
            ? 'border-brand-100 bg-white/95 shadow-[0_18px_45px_rgba(8,60,52,0.12)] backdrop-blur-xl'
            : 'border-white/60 bg-white/95 shadow-[0_10px_30px_rgba(8,60,52,0.10)] backdrop-blur-lg'
        }`}
      >
        <a href="/" className="flex min-w-0 shrink items-center gap-2.5">
          <img src={site.logo} alt={site.name} className="h-10 w-auto max-w-full object-contain sm:h-12" />
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => {
            const dd = dropdownFor(item.dropdown);
            return dd ? (
              <div key={item.label} className="relative" ref={openDropdown === item.label ? dropdownRef : undefined}>
                <button
                  onClick={() => setOpenDropdown(v => (v === item.label ? null : item.label))}
                  className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                >
                  {item.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === item.label ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === item.label && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 max-h-[70vh] overflow-y-auto rounded-2xl border border-brand-100 bg-white shadow-float py-2 z-50">
                    <div className="px-3 pb-1.5 pt-0.5">
                      <p className="text-[10px] font-800 text-ink-400 uppercase tracking-wider">Our {item.label}</p>
                    </div>
                    {dd.links.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setOpenDropdown(null)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-ink-700 hover:bg-brand-50 hover:text-brand-700 transition-colors mx-1 rounded-xl"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                        {link.label}
                      </Link>
                    ))}
                    <div className="border-t border-brand-50 mt-1 pt-1">
                      <Link
                        to={dd.viewAll}
                        onClick={() => setOpenDropdown(null)}
                        className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors mx-1 rounded-xl hover:bg-brand-50"
                      >
                        View all {item.label.toLowerCase()} →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.label}
                to={item.href}
                className="rounded-full px-3.5 py-2 text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <a
            href={site.primaryPhone.href}
            aria-label="Call us"
            className="hidden h-11 w-11 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-700 transition hover:bg-brand-50 sm:flex"
          >
            <Phone className="h-4.5 w-4.5" strokeWidth={2.2} />
          </a>
          <a
            href={`${site.whatsappHref}?text=${encodeURIComponent("Hi, I'd like to book an appointment at Celestial Dental Centre.")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ backgroundColor: '#25D366', backgroundImage: 'none' }}
            className="btn-primary whitespace-nowrap !px-3.5 !py-2 text-xs !text-white sm:!px-5 sm:!py-2.5 sm:text-sm"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span className="sm:hidden">WhatsApp</span>
            <span className="hidden sm:inline">Book via WhatsApp</span>
          </a>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-800 sm:h-11 sm:w-11 lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="container-page mt-2 rounded-4xl border border-brand-100 bg-white/95 p-3 shadow-card backdrop-blur-xl lg:hidden">
          {nav.map((item) => {
            const dd = dropdownFor(item.dropdown);
            return dd ? (
              <div key={item.label}>
                <button
                  onClick={() => setMobileDropdown(v => (v === item.label ? null : item.label))}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-base font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                >
                  {item.label}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileDropdown === item.label ? 'rotate-180' : ''}`} />
                </button>
                {mobileDropdown === item.label && (
                  <div className="ml-4 mb-1 max-h-[50vh] overflow-y-auto rounded-2xl bg-brand-50/60 py-1">
                    {dd.links.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => { setMenuOpen(false); setMobileDropdown(null); }}
                        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-brand-100 hover:text-brand-700 mx-1"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                        {link.label}
                      </Link>
                    ))}
                    <Link
                      to={dd.viewAll}
                      onClick={() => { setMenuOpen(false); setMobileDropdown(null); }}
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-brand-600 hover:text-brand-800 transition mx-1"
                    >
                      View all →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.label}
                to={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-2xl px-4 py-3 text-base font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
