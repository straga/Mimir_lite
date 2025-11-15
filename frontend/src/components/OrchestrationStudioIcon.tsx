/**
 * Orchestration Studio Icon - Ansuz Rune
 * 
 * Ansuz (ᚨ) - The rune of communication, wisdom, and divine inspiration.
 * Represents Odin's gift of knowledge and the power of orchestration.
 */

interface OrchestrationStudioIconProps {
  className?: string;
  size?: number;
}

export function OrchestrationStudioIcon({ className = '', size = 96 }: OrchestrationStudioIconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 220 220" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="220" height="220" fill="#0B0B0C" rx="8"/>
      <g transform="translate(60,20)">
        {/* Stylized Ansuz Rune */}
        <path d="M40 0 L20 180" stroke="#E5E5E5" strokeWidth="14" strokeLinecap="round"/>
        <path d="M40 60 L100 20" stroke="#E5E5E5" strokeWidth="14" strokeLinecap="round"/>
        <path d="M40 110 L95 80" stroke="#E5E5E5" strokeWidth="14" strokeLinecap="round"/>
      </g>
      {/* Text */}
      <text 
        x="110" 
        y="205" 
        fontFamily="Georgia, serif" 
        fontSize="22" 
        fill="#E5E5E5" 
        textAnchor="middle" 
        letterSpacing="2"
      >
      </text>
    </svg>
  );
}
