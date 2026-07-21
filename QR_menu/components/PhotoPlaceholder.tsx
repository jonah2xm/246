import { hueForName } from "@/lib/placeholder";

export default function PhotoPlaceholder({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const hue = hueForName(name);
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{
        background: `linear-gradient(135deg, oklch(0.32 0.05 ${hue}), oklch(0.2 0.03 ${hue}))`,
      }}
    >
      <span className="px-3 text-center font-display text-xl tracking-wide text-fg/70">
        {name}
      </span>
    </div>
  );
}
