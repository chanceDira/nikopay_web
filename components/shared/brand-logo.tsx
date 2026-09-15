import Image from "next/image";

type BrandLogoProps = {
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  width = 130,
  height = 36,
  className = "h-8",
  priority,
}: BrandLogoProps) {
  return (
    <span
      className={`relative inline-block aspect-[790/316] shrink-0 ${className}`}
    >
      <Image
        src="/nikopay-logo.png"
        alt="NikoPay"
        width={width}
        height={height}
        className="niko-logo-dark absolute inset-0 h-full w-full object-contain"
        priority={priority}
      />
      <Image
        src="/nikopay-logo-light.png"
        alt=""
        width={width}
        height={height}
        className="niko-logo-light absolute inset-0 h-full w-full object-contain"
        aria-hidden
      />
    </span>
  );
}
