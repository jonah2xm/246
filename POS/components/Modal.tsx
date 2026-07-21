"use client";

export default function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className={`flex max-h-[90vh] w-full ${wide ? "max-w-[640px]" : "max-w-[440px]"} flex-col overflow-hidden rounded-2xl border border-border bg-panel-2 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="font-display text-xl tracking-wide">{title}</div>
          <button onClick={onClose} className="text-xl leading-none text-muted transition-colors hover:text-fg">
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "rounded-xl border border-border bg-panel px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-green";

export const btnPrimary =
  "rounded-xl bg-green px-5 py-2.5 font-display text-base tracking-wide text-[#08130a] transition-colors hover:bg-green-hover disabled:opacity-50";

export const btnGhost =
  "rounded-xl border border-border px-4 py-2.5 text-sm text-muted transition-colors hover:border-green hover:text-fg";

export const btnDanger =
  "rounded-xl border border-red px-4 py-2.5 text-sm text-red transition-colors hover:bg-red-soft";
