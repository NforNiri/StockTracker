"use client";
import { useEffect, useRef, useMemo } from "react";

const useTradingViewWidget = (
  scriptUrl: string,
  config: Record<string, unknown>,
  height: number = 600,
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Stabilize config to avoid complex dependency warning
  const configStr = useMemo(() => JSON.stringify(config), [config]);

  useEffect(() => {
    // Capture ref value to variable for cleanup
    const container = containerRef.current;
    
    if (!container) return; // check if ref is null before using
    if (container.dataset.loaded) return;

    container.innerHTML = `<div class="tradingview-widget-container__widget" style="width: 100%; height: ${height}px;"></div>`;

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.innerHTML = configStr;
    container.appendChild(script);
    container.dataset.loaded = "true";

    return () => {
      if (container) {
        container.innerHTML = "";
        delete container.dataset.loaded;
      }
    };
  }, [scriptUrl, configStr, height]);

  return containerRef;
};

export default useTradingViewWidget;