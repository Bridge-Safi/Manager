export function BridgeLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="10" fill="white" fillOpacity="0.2" />
      {/* Bridge arch */}
      <path
        d="M6 26 C6 14 34 14 34 26"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Left pillar */}
      <line x1="6" y1="26" x2="6" y2="33" stroke="white" strokeWidth="3" strokeLinecap="round" />
      {/* Right pillar */}
      <line x1="34" y1="26" x2="34" y2="33" stroke="white" strokeWidth="3" strokeLinecap="round" />
      {/* Road */}
      <line x1="4" y1="33" x2="36" y2="33" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      {/* Fork tines (above bridge — food symbol) */}
      <line x1="17" y1="8" x2="17" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="8" x2="20" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="23" y1="8" x2="23" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
      {/* Fork handle */}
      <line x1="20" y1="16" x2="20" y2="22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
