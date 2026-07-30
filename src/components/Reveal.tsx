import { useEffect, useRef, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'li';
};

/**
 * Shared safety net. Some mobile browsers deliver IntersectionObserver
 * callbacks unreliably, which could leave a reveal stuck at opacity 0 forever
 * (the Testimonials section — white cards on a white background — then reads as
 * a blank gap). A single throttled scroll/resize pass reveals any in-view
 * element the observer missed, so content can never stay hidden.
 */
const pending = new Set<HTMLElement>();
let listening = false;
let ticking = false;

function sweep() {
  ticking = false;
  const vh = window.innerHeight;
  pending.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < vh && rect.bottom > 0) {
      el.classList.add('is-visible');
      pending.delete(el);
    }
  });
  if (pending.size === 0) stopListening();
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(sweep);
  }
}

function startListening() {
  if (listening) return;
  listening = true;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
}

function stopListening() {
  if (!listening) return;
  listening = false;
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onScroll);
}

export function Reveal({ children, className = '', delay = 0, as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => el.classList.add('is-visible');

    // No observer support → never hide the content.
    if (typeof IntersectionObserver === 'undefined') {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show();
            observer.unobserve(el);
            pending.delete(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);

    // Reveal right away if already in view on mount…
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      show();
    } else {
      // …otherwise hand it to the shared scroll fallback in case the
      // observer never fires on this device.
      pending.add(el);
      startListening();
    }

    return () => {
      observer.disconnect();
      pending.delete(el);
    };
  }, []);

  const Tag = as as 'div';
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
