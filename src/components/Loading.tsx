/** Branded loading indicator: spinning ring in brand colours with a label. */
export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-4 py-16">
      <span className="relative block h-12 w-12">
        <span className="absolute inset-0 rounded-full border-4 border-brand-100" />
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-brand-500" />
      </span>
      <p className="text-sm font-800 text-ink-500">{label}</p>
    </div>
  );
}
