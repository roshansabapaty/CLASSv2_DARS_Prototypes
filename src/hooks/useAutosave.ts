import { useEffect, useRef, useState } from "react";

interface AutosaveOptions {
  key: string;
  data: any;
  interval?: number; // milliseconds
  enabled?: boolean;
}

interface AutosaveResult {
  lastSaved: Date | null;
  isSaving: boolean;
  hasSavedData: boolean;
  clearSavedData: () => void;
  getSavedData: () => any | null;
  forceSave: () => void;
}

export function useAutosave({
  key,
  data,
  interval = 30000, // 30 seconds
  enabled = true,
}: AutosaveOptions): AutosaveResult {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const lastDataRef = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveData = () => {
    if (!enabled) return;
    
    try {
      const dataString = JSON.stringify(data);
      
      // Only save if data has changed
      if (dataString === lastDataRef.current) {
        return;
      }
      
      setIsSaving(true);
      localStorage.setItem(`autosave_${key}`, dataString);
      localStorage.setItem(`autosave_${key}_timestamp`, new Date().toISOString());
      lastDataRef.current = dataString;
      setLastSaved(new Date());
      setIsSaving(false);
    } catch (error) {
      console.error("Failed to autosave:", error);
      setIsSaving(false);
    }
  };

  const forceSave = () => {
    saveData();
  };

  const clearSavedData = () => {
    localStorage.removeItem(`autosave_${key}`);
    localStorage.removeItem(`autosave_${key}_timestamp`);
    setLastSaved(null);
    lastDataRef.current = "";
  };

  const getSavedData = (): any | null => {
    try {
      const saved = localStorage.getItem(`autosave_${key}`);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error("Failed to retrieve saved data:", error);
      return null;
    }
  };

  const hasSavedData = (): boolean => {
    return localStorage.getItem(`autosave_${key}`) !== null;
  };

  // Set up autosave interval
  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set up new timeout
    timeoutRef.current = setTimeout(() => {
      saveData();
    }, interval);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, interval, enabled]);

  // Save on page unload
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      saveData();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [data, enabled]);

  // Check for saved data on mount
  useEffect(() => {
    const timestamp = localStorage.getItem(`autosave_${key}_timestamp`);
    if (timestamp) {
      setLastSaved(new Date(timestamp));
    }
  }, [key]);

  return {
    lastSaved,
    isSaving,
    hasSavedData: hasSavedData(),
    clearSavedData,
    getSavedData,
    forceSave,
  };
}
