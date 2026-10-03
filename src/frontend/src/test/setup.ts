import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Generated components expose `data-ocid` hooks rather than stable roles for
// every control, so configure the test-id attribute once here.
configure({ testIdAttribute: "data-ocid" });

// jsdom does not implement matchMedia, which the toast library reads on mount.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
