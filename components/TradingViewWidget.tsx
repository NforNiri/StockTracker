"use client";
import useTradingViewWidget from "@/hooks/useTradingViewWidget";
// TradingViewWidget.jsx
import { memo } from "react";
import { cn } from "@/lib/utils";

interface TradingViewWidgetProps {
  title?: string;
  scriptUrl: string;
  config: Record<string, unknown>;
  height?: number;
  className?: string;
}

function TradingViewWidget({
  title,
  scriptUrl,
  config,
  height = 600,
  className,
}: TradingViewWidgetProps) {
  const containerRef = useTradingViewWidget(scriptUrl, config, height);

  return (
    <div className="w-full">
      {title && (
        <h3 className="font-semibold text-2xl text-gray-100 mb-5">{title}</h3>
      )}
      <div
        className={cn("tradingview-widget-container", className)}
        ref={containerRef}
      />
    </div>
  );
}

export default memo(TradingViewWidget);
