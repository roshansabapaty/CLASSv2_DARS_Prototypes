import React, { useEffect, useState } from "react";

interface AriaLiveRegionProps {
  message: string;
  politeness?: "polite" | "assertive";
  clearDelay?: number;
}

export function AriaLiveRegion({ 
  message, 
  politeness = "polite",
  clearDelay = 5000 
}: AriaLiveRegionProps) {
  const [announcement, setAnnouncement] = useState(message);

  useEffect(() => {
    setAnnouncement(message);
    
    if (clearDelay > 0) {
      const timer = setTimeout(() => {
        setAnnouncement("");
      }, clearDelay);
      
      return () => clearTimeout(timer);
    }
  }, [message, clearDelay]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

// Hook for managing announcements
export function useAnnouncer() {
  const [announcement, setAnnouncement] = useState("");

  const announce = (message: string) => {
    setAnnouncement(message);
  };

  return { announcement, announce };
}
