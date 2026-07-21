"use client";

const SIZE_CLASS = {
  normal: "max-w-[520px]",
  wide: "max-w-[760px]",
  xwide: "max-w-[980px]",
};

export default function Modal({
  title,
  onClose,
  children,
  wide = false,
  size,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** @deprecated use `size="wide"` instead */
  wide?: boolean;
  size?: "normal" | "wide" | "xwide";
}) {
  const resolvedSize = size || (wide ? "wide" : "normal");
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className={`flex max-h-[92vh] w-full ${SIZE_CLASS[resolvedSize]} flex-col overflow-hidden rounded-3xl border border-border bg-panel-2 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-7 py-5">
          <div className="font-display text-2xl tracking-wide">{title}</div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-xl leading-none text-muted transition-colors motion-safe:active:scale-90 hover:bg-panel hover:text-fg"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-5 overflow-y-auto px-7 py-6">{children}</div>
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
  "min-h-11 rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none transition-colors focus:border-green";

export const btnPrimary =
  "min-h-11 rounded-xl bg-green px-5 py-2.5 font-display text-base tracking-wide text-[#08130a] transition-colors motion-safe:active:scale-95 hover:bg-green-hover disabled:opacity-50";

export const btnGhost =
  "min-h-11 rounded-xl border border-border px-4 py-2.5 text-sm text-muted transition-colors motion-safe:active:scale-95 hover:border-green hover:text-fg";

export const btnDanger =
  "min-h-11 rounded-xl border border-red px-4 py-2.5 text-sm text-red transition-colors motion-safe:active:scale-95 hover:bg-red-soft";
