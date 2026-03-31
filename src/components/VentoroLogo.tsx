interface VentoroLogoProps {
  variant?: 'light' | 'dark' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function VentoroLogo({
  variant = 'light',
  size = 'md',
  showText = true
}: VentoroLogoProps) {
  const sizes = { sm: 24, md: 32, lg: 40 };
  const textSizes = { sm: '16px', md: '20px', lg: '26px' };
  const iconSize = sizes[size];

  const textColors = {
    light: { primary: '#0C0C0A', accent: '#1D9E75' },
    dark: { primary: '#FFFFFF', accent: '#9FE1CB' },
    brand: { primary: '#FFFFFF', accent: 'rgba(255,255,255,0.7)' }
  };

  const colors = textColors[variant];

  return (
    <div className="flex items-center gap-2">
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" fill="#1D9E75" />
        <path d="M12 28L20 12L28 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 22H25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {showText && (
        <span style={{ fontSize: textSizes[size], fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}>
          <span style={{ color: colors.primary }}>Ven</span>
          <span style={{ color: colors.accent }}>toro</span>
        </span>
      )}
    </div>
  );
}
