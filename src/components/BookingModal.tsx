import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { referralSources, services as staticServices, site } from '../data/site';
import { useBranches } from '../data/branches';
import { useSection } from '../data/siteData';
import { useBooking } from './booking';
import { pushEvent } from '../lib/track';
import { describeNetworkError, describeResponseError } from '../lib/errors';

// Whatever the reason, a patient who can't book online should be told how to
// reach the clinic instead of being left with a dead form.
const BOOKING_FALLBACK = `You can also book on ${site.primaryPhone.label}.`;

export function BookingModal() {
  const { open, closeBooking, presetService } = useBooking();
  const branches = useBranches();
  const services = useSection<{ title: string }>('services', staticServices);
  const serviceOptions = [...services.map(s => s.title), 'Other'];
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [branch, setBranch] = useState('');
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const [referral, setReferral] = useState('');
  const [referralOther, setReferralOther] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setService(presetService);
      setSent(false);
      setError('');
    }
  }, [open, presetService]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, email, branch, service, date, time, message,
          referral: referral === 'Other' ? (referralOther.trim() || 'Other') : referral,
        }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null) as { error?: string } | null;
        console.error('Booking failed', res.status, detail);
        setError(describeResponseError(res.status, detail?.error, {
          action: 'save your booking',
          fallback: BOOKING_FALLBACK,
        }));
        return;
      }

      // Conversion: appointment request saved (GTM 'booking_submitted' + Meta Lead)
      pushEvent('booking_submitted', { service: service || 'General', branch: branch || 'Any' });
      window.fbq?.('track', 'Lead');

      // The server now delivers the booking straight to the selected branch's
      // WhatsApp via the bot gateway (see api/appointments.ts), so there's no
      // longer a need to open the patient's WhatsApp and ask them to press send.
      setSent(true);
    } catch (err) {
      console.error('Booking request failed', err);
      setError(describeNetworkError(err, {
        action: 'save your booking',
        fallback: BOOKING_FALLBACK,
      }));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-brand-100 px-4 py-3 text-sm outline-none focus:border-brand-400 transition-colors';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-7 shadow-float">
        <button
          onClick={closeBooking}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100"
          aria-label="Close booking form"
        >
          <X className="h-4 w-4" />
        </button>

        {sent ? (
          <div className="py-8 text-center">
            <div className="mb-4 text-5xl">✓</div>
            <h3 className="mb-2 text-xl font-900 text-ink-900">Booking received!</h3>
            <p className="text-sm text-ink-500">Your request has been saved and sent straight to your chosen branch on WhatsApp. The team will confirm shortly — usually within 5 minutes during opening hours.</p>
            <button onClick={closeBooking} className="btn-primary mt-6 w-full">Done</button>
          </div>
        ) : (
          <>
            <h3 className="mb-1 text-xl font-900 text-ink-900">Book an appointment</h3>
            <p className="mb-5 text-sm text-ink-500">Fill in your details and we'll confirm within 5 minutes.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full name *" className={`col-span-2 ${inputClass}`} />
                <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number *" className={inputClass} />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)" className={inputClass} />
              </div>

              <select required value={branch} onChange={e => setBranch(e.target.value)} className={inputClass}>
                <option value="">Select a branch *</option>
                {branches.map(b => (
                  <option key={b.slug} value={b.name}>{b.name}</option>
                ))}
              </select>

              <select required value={service} onChange={e => setService(e.target.value)} className={inputClass}>
                <option value="">Select a service *</option>
                {serviceOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-700 text-ink-500">Preferred date *</label>
                  <input required type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className={inputClass} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-700 text-ink-500">Preferred time *</label>
                  <select required value={time} onChange={e => setTime(e.target.value)} className={inputClass}>
                    <option value="">Select time</option>
                    {['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Any additional notes (optional)" rows={2} className={`${inputClass} resize-none`} />

              <div>
                <label className="mb-1 block text-xs font-700 text-ink-500">How did you hear about us?</label>
                <select value={referral} onChange={e => setReferral(e.target.value)} className={inputClass}>
                  <option value="">Select an option</option>
                  {referralSources.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
                {referral === 'Other' && (
                  <input
                    value={referralOther}
                    onChange={e => setReferralOther(e.target.value)}
                    placeholder="Please tell us how you heard about us"
                    className={`mt-3 ${inputClass}`}
                  />
                )}
              </div>

              {error && <p className="text-sm font-600 text-red-500">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary mt-1 w-full disabled:opacity-60">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    Saving...
                  </span>
                ) : (
                  <><MessageCircle className="h-4 w-4" /> Confirm Booking</>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
