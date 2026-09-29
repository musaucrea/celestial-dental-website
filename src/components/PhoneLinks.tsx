import { Fragment } from 'react';

/**
 * A phone field may hold more than one number, separated by "/"
 * (e.g. "+254 709 000 241 / +254 707 535 000"). Each one becomes its own
 * tel: link so a tap dials the number that was tapped.
 */
export function phoneParts(phone: string): { label: string; href: string }[] {
  return phone
    .split('/')
    .map(p => p.trim())
    .filter(Boolean)
    .map(label => ({ label, href: `tel:${label.replace(/[^+\d]/g, '')}` }));
}

export function PhoneLinks({ phone, className }: { phone: string; className?: string }) {
  return (
    <>
      {phoneParts(phone).map((p, i) => (
        <Fragment key={p.href}>
          {i > 0 && <span aria-hidden="true"> / </span>}
          <a href={p.href} className={`whitespace-nowrap ${className ?? ''}`}>{p.label}</a>
        </Fragment>
      ))}
    </>
  );
}
