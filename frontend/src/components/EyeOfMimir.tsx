/**
 * Eye of Mimir - The all-seeing eye over the Well of Knowledge
 * 
 * Norse mythology: Mimir sacrificed his eye to drink from the Well of Knowledge
 * beneath Yggdrasil, gaining infinite wisdom. This component represents that eye,
 * watching over the well with the World Tree in the background.
 */

interface EyeOfMimirProps {
  className?: string;
  size?: number;
}

export function EyeOfMimir({ className = '', size = 128 }: EyeOfMimirProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Glow effect */}
      <defs>
        <radialGradient id="eyeGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="irisGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="70%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#8B7355" />
        </radialGradient>
        <linearGradient id="treeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#4A5568" />
          <stop offset="100%" stopColor="#2D3748" />
        </linearGradient>
        <radialGradient id="wellGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#1A365D" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
      </defs>

      {/* Background - Yggdrasil (World Tree) silhouette */}
      <g opacity="0.3">
        {/* Tree trunk */}
        <path
          d="M95 150 L95 80 Q95 75 98 72 L102 68 Q105 65 105 60 L105 50"
          stroke="url(#treeGradient)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Tree branches */}
        <path
          d="M105 70 Q115 65 125 68 Q130 70 135 65"
          stroke="url(#treeGradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M105 85 Q90 80 80 85 Q75 88 70 83"
          stroke="url(#treeGradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M105 100 Q118 95 128 100"
          stroke="url(#treeGradient)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M95 95 Q82 90 72 95"
          stroke="url(#treeGradient)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Tree roots at base */}
        <path
          d="M95 150 Q90 155 85 160"
          stroke="url(#treeGradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M95 150 Q100 155 105 160"
          stroke="url(#treeGradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Well of Knowledge - circular pool at bottom */}
      <g opacity="0.5">
        <ellipse
          cx="100"
          cy="165"
          rx="45"
          ry="15"
          fill="url(#wellGradient)"
          opacity="0.8"
        />
        {/* Well rim */}
        <ellipse
          cx="100"
          cy="163"
          rx="48"
          ry="16"
          fill="none"
          stroke="#4A5568"
          strokeWidth="2"
        />
        {/* Ripples in the well */}
        <ellipse
          cx="100"
          cy="165"
          rx="30"
          ry="8"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="1"
          opacity="0.3"
        />
        <ellipse
          cx="100"
          cy="166"
          rx="20"
          ry="5"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="0.5"
          opacity="0.2"
        />
      </g>

      {/* The All-Seeing Eye */}
      <g>
        {/* Eye glow aura */}
        <ellipse
          cx="100"
          cy="100"
          rx="60"
          ry="40"
          fill="url(#eyeGlow)"
        />

        {/* Eye white */}
        <ellipse
          cx="100"
          cy="100"
          rx="45"
          ry="28"
          fill="#F8F9FA"
          stroke="#2D3748"
          strokeWidth="2"
        />

        {/* Iris */}
        <circle
          cx="100"
          cy="100"
          r="18"
          fill="url(#irisGradient)"
          stroke="#8B7355"
          strokeWidth="1"
        />

        {/* Pupil */}
        <circle
          cx="100"
          cy="100"
          r="8"
          fill="#0F172A"
        />

        {/* Eye highlight/gleam */}
        <circle
          cx="106"
          cy="95"
          r="4"
          fill="#FFD700"
          opacity="0.8"
        />
        <circle
          cx="108"
          cy="93"
          r="2"
          fill="#FFFFFF"
        />

        {/* Upper eyelid */}
        <path
          d="M55 100 Q100 75 145 100"
          fill="none"
          stroke="#1A202C"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Lower eyelid */}
        <path
          d="M55 100 Q100 115 145 100"
          fill="none"
          stroke="#1A202C"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Mystical runes around the eye */}
        <g opacity="0.4" stroke="#D4AF37" strokeWidth="2">
          {/* Top rune */}
          <path d="M98 65 L98 55 M102 65 L102 55 M95 60 L105 60" strokeLinecap="round" />
          {/* Left rune */}
          <path d="M45 95 L40 95 M45 105 L40 105 M40 95 L40 105" strokeLinecap="round" />
          {/* Right rune */}
          <path d="M155 95 L160 95 M155 105 L160 105 M160 95 L160 105" strokeLinecap="round" />
          {/* Bottom rune */}
          <path d="M98 135 L98 145 M102 135 L102 145 M95 140 L105 140" strokeLinecap="round" />
        </g>
      </g>

      {/* Floating particles/magic around the eye */}
      <g opacity="0.6">
        <circle cx="65" cy="85" r="1.5" fill="#D4AF37">
          <animate
            attributeName="opacity"
            values="0.3;1;0.3"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="135" cy="115" r="1" fill="#D4AF37">
          <animate
            attributeName="opacity"
            values="0.5;1;0.5"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="75" cy="120" r="1.5" fill="#FFD700">
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="125" cy="80" r="1" fill="#FFD700">
          <animate
            attributeName="opacity"
            values="0.6;1;0.6"
            dur="3.5s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    </svg>
  );
}
