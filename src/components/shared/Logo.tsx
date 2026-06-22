import nameSrc from "../../assets/name.svg";
import nameAndSloganSrc from "../../assets/name_and_slogan.svg";
import logoMarkSrc from "../../assets/logo.svg";

type LogoVariant = "mark" | "name" | "full";

interface LogoProps {
  variant?: LogoVariant;
  height?: number;
  className?: string;
}

export function Logo({ variant = "name", height = 32, className }: LogoProps) {
  const src =
    variant === "mark"
      ? logoMarkSrc
      : variant === "full"
        ? nameAndSloganSrc
        : nameSrc;
  return (
    <img src={src} alt="Bas3line" style={{ height }} className={className} />
  );
}
