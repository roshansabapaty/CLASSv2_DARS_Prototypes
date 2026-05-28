import React from "react";

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="absolute top-2 left-2 z-50 bg-[#0078d4] text-white px-4 py-2 rounded shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="absolute top-2 left-40 z-50 bg-[#0078d4] text-white px-4 py-2 rounded shadow-lg focus:outline-none focus:ring-2 focus:ring-[#0078d4] focus:ring-offset-2"
      >
        Skip to navigation
      </a>
    </div>
  );
}
