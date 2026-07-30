import { site } from '../data/site';
import { WhatsAppIcon } from './icons';

const message = "Hi, I'd like to book an appointment at Celestial Dental Centre.";

export function WhatsAppButton() {
  return (
    <a
      href={`${site.whatsappHref}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Celestial Dental on WhatsApp"
      className="fixed bottom-5 right-5 z-[60] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-float transition hover:bg-[#1fb85a] focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 sm:h-auto sm:w-auto sm:gap-2.5 sm:px-5 sm:py-4"
    >
      <WhatsAppIcon className="h-7 w-7" />
      <span className="hidden text-sm font-800 sm:inline">WhatsApp</span>
    </a>
  );
}
