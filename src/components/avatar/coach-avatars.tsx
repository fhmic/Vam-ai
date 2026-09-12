import Image from "next/image";
import type { SVGProps } from "react";

function PhotoAvatar({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={128}
      height={128}
      className={`animate-avatar-bob rounded-full object-cover object-top ${className}`}
    />
  );
}

export function AvatarMorgan({ className }: { className?: string }) {
  return <PhotoAvatar src="/avatars/morgan.png" alt="Morgan" className={className} />;
}

export function AvatarAva({ className }: { className?: string }) {
  return <PhotoAvatar src="/avatars/ava.png" alt="Ava" className={className} />;
}

export function AvatarPriya({ className }: { className?: string }) {
  return <PhotoAvatar src="/avatars/priya.png" alt="Priya" className={className} />;
}

export function AvatarElias({ className }: { className?: string }) {
  return <PhotoAvatar src="/avatars/elias.png" alt="Elias" className={className} />;
}

/** Module companions (no photo provided) — kept as illustrated SVGs. */
type AvatarProps = SVGProps<SVGSVGElement>;

function BaseAvatar({
  skin,
  outfit,
  hair,
  children,
  ...props
}: AvatarProps & { skin: string; outfit: string; hair: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 120" className="animate-avatar-bob" {...props}>
      <path d="M20 118 C20 92 40 82 60 82 C80 82 100 92 100 118 Z" fill={outfit} />
      <rect x="50" y="68" width="20" height="16" fill={skin} />
      <circle cx="60" cy="48" r="30" fill={skin} />
      {hair}
      <g className="origin-center animate-blink" style={{ transformBox: "fill-box" }}>
        <circle cx="49" cy="48" r="3.2" fill="#12151B" />
        <circle cx="71" cy="48" r="3.2" fill="#12151B" />
      </g>
      <path d="M48 60 Q60 68 72 60" stroke="#12151B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {children}
    </svg>
  );
}

export function AvatarRiley(props: AvatarProps) {
  return (
    <BaseAvatar
      skin="#D9A66C"
      outfit="#5FADA9"
      hair={<path d="M29 40 C29 12 91 12 91 40 C91 22 29 22 29 40 Z" fill="#2B2118" />}
      {...props}
    />
  );
}

export function AvatarNova(props: AvatarProps) {
  return (
    <BaseAvatar
      skin="#F2D3B3"
      outfit="#F0CA7C"
      hair={
        <>
          <circle cx="60" cy="30" r="24" fill="#6B4226" />
          <circle cx="34" cy="52" r="8" fill="#6B4226" />
          <circle cx="86" cy="52" r="8" fill="#6B4226" />
        </>
      }
      {...props}
    />
  );
}
