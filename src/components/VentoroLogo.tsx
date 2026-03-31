interface VentoroLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VentoroLogo({ size = 'md', className = '' }: VentoroLogoProps) {
  const heights = { sm: 32, md: 44, lg: 56 };
  const h = heights[size];

  return (
    <img
      src="/logo-ventoro.png"
      alt="Ventoro"
      height={h}
      style={{
        height: `${h}px`,
        width: 'auto',
        objectFit: 'contain',
        display: 'block',
      }}
      className={className}
    />
  );
}
