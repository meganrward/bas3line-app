import nameSrc from '../../assets/name.svg';
import nameAndSloganSrc from '../../assets/name_and_slogan.svg';
import logoMarkSrc from '../../assets/logo.svg';

type LogoVariant = 'mark' | 'name' | 'full';

interface LogoProps {
  variant?: LogoVariant;
  height?: number;
  className?: string;
}

const LOGO_SOURCES: Record<LogoVariant, string> = {
  mark: logoMarkSrc,
  name: nameSrc,
  full: nameAndSloganSrc,
};

export function Logo({ variant = 'name', height = 32, className }: Readonly<LogoProps>) {
  return (
    <img src={LOGO_SOURCES[variant]} alt="Bas3line" style={{ height }} className={className} />
  );
}
