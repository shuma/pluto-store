import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// useSyncExternalStore rather than an effect: this project's eslint config
// rejects setState inside an effect body, and the media query is exactly the
// kind of external store this hook is for.
export function useIsMobile() {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", onStoreChange);
    return () => mql.removeEventListener("change", onStoreChange);
  }, []);
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );
}
