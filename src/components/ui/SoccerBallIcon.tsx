interface SoccerBallIconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function SoccerBallIcon({
  size = 24,
  strokeWidth = 2,
  className,
  style,
}: SoccerBallIconProps) {
  const sw = strokeWidth;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Outer circle */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={sw} />
      {/* Center pentagon patch */}
      <polygon
        points="12,7.5 16.3,10.6 14.6,15.6 9.4,15.6 7.7,10.6"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth={sw * 0.75}
        strokeLinejoin="round"
      />
      {/* Seam lines from pentagon vertices to circle edge */}
      <line x1="12"  y1="3"    x2="12"  y2="7.5"  stroke="currentColor" strokeWidth={sw * 0.75} strokeLinecap="round" />
      <line x1="20.6" y1="9.2" x2="16.3" y2="10.6" stroke="currentColor" strokeWidth={sw * 0.75} strokeLinecap="round" />
      <line x1="17.3" y1="19.3" x2="14.6" y2="15.6" stroke="currentColor" strokeWidth={sw * 0.75} strokeLinecap="round" />
      <line x1="6.7" y1="19.3" x2="9.4"  y2="15.6" stroke="currentColor" strokeWidth={sw * 0.75} strokeLinecap="round" />
      <line x1="3.4" y1="9.2"  x2="7.7"  y2="10.6" stroke="currentColor" strokeWidth={sw * 0.75} strokeLinecap="round" />
    </svg>
  );
}
