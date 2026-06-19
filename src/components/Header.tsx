import { useEffect, useRef, useState } from 'react';
import { Menu, Phone, X, MessageCircle, ChevronDown } from 'lucide-react';
import { nav, site } from '../data/site';
import { useBooking } from './booking';
import { Link } from 'react-router-dom';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [branchesOpen, setBranchesOpen] = useState(false);
  const [mobileBranchesOpen, setMobileBranchesOpen] = useState(false);
  const { openBooking } = useBooking();
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
        setBranchesOpen(false);
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
            ? 'border-brand-100 bg-white/85 shadow-[0_18px_45px_rgba(8,60,52,0.12)] backdrop-blur-xl'
            : 'border-white/40 bg-white/55 backdrop-blur-md'
        }`}
      >
        <a href="/" className="flex shrink-0 items-center gap-2.5">
          <img src={site.logo} alt={site.name} className="h-10 w-auto" />
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) =>
            item.dropdown ? (
              <div key={item.label} className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setBranchesOpen(v => !v)}
                  className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                >
                  {item.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${branchesOpen ? 'rotate-180' : ''}`} />
                </button>

                {branchesOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 rounded-2xl border border-brand-100 bg-white shadow-float py-2 z-50">
                    <div className="px-3 pb-1.5 pt-0.5">
                      <p className="text-[10px] font-800 text-ink-400 uppercase tracking-wider">Our Branches</p>
                    </div>
                    {item.dropdown.map((branch) => (
                      <Link
                        key={branch.href}
                        to={branch.href}
                        onClick={() => setBranchesOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-ink-700 hover:bg-brand-50 hover:text-brand-700 transition-colors mx-1 rounded-xl"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                        {branch.label}
                      </Link>
                    ))}
                    <div className="border-t border-brand-50 mt-1 pt-1">
                      <a
                        href="/#branches"
                        onClick={() => setBranchesOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors mx-1 rounded-xl hover:bg-brand-50"
                      >
                        View all branches →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </a>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={site.primaryPhone.href}
            aria-label="Call us"
            className="hidden h-11 w-11 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-700 transition hover:bg-brand-50 sm:flex"
          >
            <Phone className="h-4.5 w-4.5" strokeWidth={2.2} />
          </a>
          <button onClick={() => openBooking()} className="btn-primary !px-5 !py-2.5 text-sm">
            <MessageCircle className="h-4 w-4" strokeWidth={2.4} />
            Book Now
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-100 bg-white text-brand-800 lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="container-page mt-2 rounded-4xl border border-brand-100 bg-white/95 p-3 shadow-card backdrop-blur-xl lg:hidden">
          {nav.map((item) =>
            item.dropdown ? (
              <div key={item.label}>
                <button
                  onClick={() => setMobileBranchesOpen(v => !v)}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-base font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                >
                  {item.label}
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileBranchesOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobileBranchesOpen && (
                  <div className="ml-4 mb-1 rounded-2xl bg-brand-50/60 py-1">
                    {item.dropdown.map((branch) => (
                      <Link
                        key={branch.href}
                        to={branch.href}
                        onClick={() => { setMenuOpen(false); setMobileBranchesOpen(false); }}
                        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-brand-100 hover:text-brand-700 mx-1"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                        {branch.label}
                      </Link>
                    ))}
                    <a
                      href="/#branches"
                      onClick={() => { setMenuOpen(false); setMobileBranchesOpen(false); }}
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-brand-600 hover:text-brand-800 transition mx-1"
                    >
                      View all →
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-2xl px-4 py-3 text-base font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
              >
                {item.label}
              </a>
            )
          )}
        </div>
      )}
    </header>
  );
}
