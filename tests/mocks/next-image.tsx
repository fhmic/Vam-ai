import type { ImgHTMLAttributes } from "react";

/** Vitest does not need Next's image optimizer to test component imports. */
export default function Image({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return <img src={typeof src === "string" ? src : undefined} alt={alt} {...props} />;
}
