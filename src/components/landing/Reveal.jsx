import React from "react";

// Entrance animation removed: it held content at opacity 0 through a 0.9s
// fade, which pushed LCP on content pages to ~1.3s. Content now renders
// immediately. The `delay` prop is kept so call sites need no changes.
export default function Reveal({ children, delay = 0, className = "" }) {
  return <div className={className}>{children}</div>;
}
