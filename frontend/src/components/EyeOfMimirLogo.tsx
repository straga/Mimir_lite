/**
 * Eye of Mímir Logo Component
 * 
 * Renders the Eye of Mímir symbol above the Well of Knowledge.
 * Used as a navigation icon to return to the Portal page.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes
 * @param {number} [props.size] - Size of the logo (default: 48)
 */

interface EyeOfMimirLogoProps {
  className?: string;
  size?: number;
}

export function EyeOfMimirLogo({ className = '', size = 48 }: EyeOfMimirLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 640"
      width={size}
      height={(size * 640) / 512}
      role="img"
      aria-label="Eye of Mímir over the Well of Knowledge"
      className={className}
    >
      <defs>
        <style>
          {`.eye { fill: none; stroke: #e8b84a; stroke-width: 24; stroke-linecap: round; stroke-linejoin: round; }
          .well { fill: none; stroke: #0b0b0b; stroke-width: 24; stroke-linecap: round; stroke-linejoin: round; }`}
        </style>
      </defs>

      {/* Eye */}
      <path
        className="eye"
        d="M64 160
           C140 40, 372 40, 448 160
           C372 280, 140 280, 64 160
           Z"
      />
      <circle className="eye" cx="256" cy="160" r="44" />

      {/* Well posts */}
      <path className="well" d="M120 260 L120 300" />
      <path className="well" d="M392 260 L392 300" />

      {/* Well top bar */}
      <path className="well" d="M112 300 L400 300" />

      {/* Basin */}
      <path
        className="well"
        d="M112 300
           L112 440
           C112 520, 400 520, 400 440
           L400 300"
      />

      {/* Brick rows */}
      <path className="well" d="M136 332 L360 332" />
      <path className="well" d="M184 332 L184 380" />
      <path className="well" d="M296 332 L296 380" />

      <path className="well" d="M136 368 L360 368" />
      <path className="well" d="M240 368 L240 420" />

      <path className="well" d="M136 404 L360 404" />
      <path className="well" d="M184 404 L184 452" />
      <path className="well" d="M296 404 L296 452" />

      {/* Bottom curve */}
      <path className="well" d="M200 492 C232 520, 280 520, 312 492" />

      <title>Eye of Mímir above the Well of Knowledge — rune emblem</title>
    </svg>
  );
}
