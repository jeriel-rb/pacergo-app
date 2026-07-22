/**
 * On-brand line-art illustrations. Strictly ink + brand + paper — drawn with
 * thick rounded strokes so figures read as bold and "athletic". The CSS color
 * variables are used directly so these work on any background.
 */

const INK = "var(--color-ink)";
const BRAND = "var(--color-brand)";

/** Hero illustration for /earn — a muscular athlete pressing a barbell overhead. */
export function LifterIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 330"
      className={className}
      fill="none"
      role="img"
      aria-label="Athlete pressing a barbell overhead"
    >
      {/* ground shadow */}
      <ellipse cx="150" cy="306" rx="92" ry="13" fill={INK} opacity="0.06" />

      {/* exertion sparks */}
      <g stroke={BRAND} strokeWidth="6" strokeLinecap="round">
        <path d="M40 38 L28 26" />
        <path d="M260 38 L272 26" />
      </g>

      {/* barbell — bar, brand weight plates, ink collars */}
      <line x1="48" y1="56" x2="252" y2="56" stroke={INK} strokeWidth="10" strokeLinecap="round" />
      <rect x="56" y="30" width="17" height="52" rx="8.5" fill={BRAND} />
      <rect x="227" y="30" width="17" height="52" rx="8.5" fill={BRAND} />
      <rect x="82" y="40" width="10" height="32" rx="5" fill={INK} />
      <rect x="208" y="40" width="10" height="32" rx="5" fill={INK} />

      {/* arms up to the bar */}
      <path d="M126 112 L120 60" stroke={INK} strokeWidth="16" strokeLinecap="round" />
      <path d="M174 112 L180 60" stroke={INK} strokeWidth="16" strokeLinecap="round" />

      {/* solid torso — shoulders dome up to the neck, taper to the waist */}
      <path
        d="M120 116 C122 98 138 92 150 92 C162 92 178 98 180 116 L163 199 Q150 206 137 199 Z"
        fill={INK}
      />

      {/* head */}
      <circle cx="150" cy="74" r="20" fill={INK} />

      {/* legs */}
      <path
        d="M122 296 L134 250 L150 198 L166 250 L178 296"
        stroke={INK}
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* feet */}
      <path d="M122 296 H106 M178 296 H194" stroke={INK} strokeWidth="14" strokeLinecap="round" />
    </svg>
  );
}

/** Hero illustration for /find — two companions meeting for a session (high five). */
export function CompanionsIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 300 320"
      className={className}
      fill="none"
      role="img"
      aria-label="Two workout partners training together"
    >
      <ellipse cx="150" cy="296" rx="112" ry="13" fill={INK} opacity="0.06" />

      {/* connection spark where their hands meet */}
      <g stroke={BRAND} strokeWidth="6" strokeLinecap="round">
        <path d="M150 64 V46" />
        <path d="M150 64 L134 52" />
        <path d="M150 64 L166 52" />
        <path d="M150 64 L132 70" />
        <path d="M150 64 L168 70" />
      </g>

      {/* left companion */}
      <g stroke={INK} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">
        <path d="M108 154 L142 78" />
        <path d="M108 152 L82 190" />
        <path d="M108 142 V204" />
        <path d="M88 270 L100 222 L108 204 L118 230 L114 270" />
      </g>
      <circle cx="108" cy="120" r="20" fill={INK} />

      {/* right companion */}
      <g stroke={INK} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">
        <path d="M192 154 L158 78" />
        <path d="M192 152 L218 190" />
        <path d="M192 142 V204" />
        <path d="M212 270 L200 222 L192 204 L182 230 L186 270" />
      </g>
      <circle cx="192" cy="120" r="20" fill={INK} />
    </svg>
  );
}

/**
 * Icon-sized barbell-lifter glyph (lucide-compatible: accepts className +
 * strokeWidth). A figure pressing a barbell — more literal than a generic badge.
 */
export function LifterGlyph({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* barbell */}
      <path d="M3 5h18" />
      <path d="M5 3v4M19 3v4" />
      {/* head */}
      <circle cx="12" cy="10" r="1.6" />
      {/* arms up to the bar */}
      <path d="M9.4 11 7 5M14.6 11 17 5" />
      {/* torso + legs */}
      <path d="M12 11.6V16" />
      <path d="M12 16 9 21M12 16l3 5" />
    </svg>
  );
}
