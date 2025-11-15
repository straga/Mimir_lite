interface MemoryRuneIconProps {
  className?: string;
}

export function MemoryRuneIcon({ className = "w-6 h-6" }: MemoryRuneIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 640" 
      className={className}
      role="img" 
      aria-label="Norse-inspired Memory rune — minimalist bind-rune"
    >
      <defs>
        <style>
          {`
            .stroke { fill: none; stroke: currentColor; stroke-width: 24; stroke-linecap: round; stroke-linejoin: round; }
            .accent { fill: none; stroke: #e8b84a; stroke-width: 24; stroke-linecap: round; stroke-linejoin: round; }
            .dot { fill: #e8b84a; stroke: none; }
          `}
        </style>
      </defs>

      {/* vertical stave (backbone of memory) */}
      <path className="stroke" d="M256 120 L256 500" />

      {/* three left-branch memories (angled strokes) */}
      <path className="stroke" d="M256 200 L188 156" />
      <path className="stroke" d="M256 300 L178 276" />
      <path className="stroke" d="M256 380 L188 340" />

      {/* three right-branch memories (mirrored) */}
      <path className="stroke" d="M256 200 L324 156" />
      <path className="stroke" d="M256 300 L334 276" />
      <path className="stroke" d="M256 380 L324 340" />

      {/* interstitial horizontal ties (binding the memories together) */}
      <path className="stroke" d="M210 244 L302 244" />
      <path className="stroke" d="M200 328 L312 328" />

      {/* bottom knot / cup (container of memory) */}
      <path className="stroke" d="M192 460 C208 520, 304 520, 320 460" />

      {/* top seed / focal mnemonic (gold accent circle) */}
      <circle className="dot" cx="256" cy="84" r="20" />

      <title>Norse-inspired Memory rune — minimalist bind-rune</title>
    </svg>
  );
}
