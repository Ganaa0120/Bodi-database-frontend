import React from 'react';

interface BodiLogoProps {
  className?: string;
  /**
   * Одоогоор ганц зурган лого ашиглаж байгаа тул variant нь зөвхөн
   * API нийцтэй байдлыг хадгалахад зориулагдсан (хэмжээнд нөлөөлөхгүй).
   */
  variant?: 'full' | 'emblem' | 'compact';
  themeMode?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const HEIGHT_BY_SIZE: Record<NonNullable<BodiLogoProps['size']>, number> = {
  sm: 24,
  md: 32,
  lg: 42,
  xl: 54,
};

export const BodiLogo: React.FC<BodiLogoProps> = ({ className = '', themeMode = 'dark', size = 'md' }) => {
  const height = HEIGHT_BY_SIZE[size];

  // dark горимд бараан дэвсгэр дээр харагдах ЦАГААН лого,
  // light горимд цайвар дэвсгэр дээр харагдах ӨНГӨТ лого ашиглана.
  const src =
    themeMode === 'dark' ? '/images/Bodi-Group-logo-PNG-ENG-white.png' : '/images/Bodigroup-EN.png';

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Bodi Group" style={{ height, width: 'auto' }} className="shrink-0 object-contain" />
    </div>
  );
};