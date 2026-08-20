import Image, { type ImageProps } from "next/image";
import { isPreoptimizedImageSource } from "../lib/media-url";

export default function StorefrontImage({ unoptimized, alt, ...props }: ImageProps) {
  const preoptimized = typeof props.src === "string" && isPreoptimizedImageSource(props.src);
  return <Image {...props} alt={alt} unoptimized={Boolean(unoptimized || preoptimized)} />;
}
