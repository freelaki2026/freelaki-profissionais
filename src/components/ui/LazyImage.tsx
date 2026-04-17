import { ImgHTMLAttributes, forwardRef } from "react";

/**
 * <img> com lazy loading + decoding async por padrão.
 * Usa fetchpriority="high" só quando explicitamente marcado como "priority".
 */
type Props = ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
};

export const LazyImage = forwardRef<HTMLImageElement, Props>(
  ({ priority = false, loading, decoding, ...rest }, ref) => (
    <img
      ref={ref}
      loading={loading ?? (priority ? "eager" : "lazy")}
      decoding={decoding ?? "async"}
      // @ts-expect-error fetchpriority é HTML válido, ainda fora do typings
      fetchpriority={priority ? "high" : "low"}
      {...rest}
    />
  ),
);

LazyImage.displayName = "LazyImage";

export default LazyImage;
