import { forwardRef, MouseEvent, TouchEvent } from "react";
import { Link, LinkProps } from "react-router-dom";
import { prefetchRoute } from "@/lib/routePrefetch";

/**
 * <Link> com prefetch do chunk da rota no primeiro hover/touchstart.
 * Drop-in replacement para react-router-dom Link em qualquer card/menu.
 */
type Props = LinkProps & {
  prefetchDisabled?: boolean;
};

export const PrefetchLink = forwardRef<HTMLAnchorElement, Props>(
  ({ to, onMouseEnter, onTouchStart, prefetchDisabled, ...rest }, ref) => {
    const target = typeof to === "string" ? to : to.pathname ?? "";

    const handleMouse = (e: MouseEvent<HTMLAnchorElement>) => {
      if (!prefetchDisabled && target) prefetchRoute(target);
      onMouseEnter?.(e);
    };
    const handleTouch = (e: TouchEvent<HTMLAnchorElement>) => {
      if (!prefetchDisabled && target) prefetchRoute(target);
      onTouchStart?.(e);
    };

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={handleMouse}
        onTouchStart={handleTouch}
        {...rest}
      />
    );
  },
);
PrefetchLink.displayName = "PrefetchLink";

export default PrefetchLink;
