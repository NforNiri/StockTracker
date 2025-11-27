import React from "react";
import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import {
  SYMBOL_INFO_WIDGET_CONFIG,
  CANDLE_CHART_WIDGET_CONFIG,
  BASELINE_WIDGET_CONFIG,
  TECHNICAL_ANALYSIS_WIDGET_CONFIG,
  COMPANY_PROFILE_WIDGET_CONFIG,
  COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";
import { isStockInWatchlist } from "@/lib/actions/watchlist.actions";
import { searchStocks } from "@/lib/actions/finnhub.actions";

interface StockDetailsPageProps {
  params: {
    symbol: string;
  };
}

export default async function StockDetails({ params }: StockDetailsPageProps) {
  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol).toUpperCase();
  
  // Verify symbol exists and get company name
  // Using searchStocks to get basic info if possible, or fallback
  // searchStocks(symbol) -> returns array.
  // Actually, we can assume the symbol is valid if user navigated here, 
  // but we need company name for watchlist.
  // We can fetch profile via finnhub action if exposed, or just use symbol as name if we can't find it.
  // Ideally we'd have a `getStockProfile` action.
  // For now, let's assume searchStocks returns it.
  
  const stocks = await searchStocks(decodedSymbol);
  const stockInfo = stocks.find(s => s.symbol === decodedSymbol) || { 
    symbol: decodedSymbol, 
    name: decodedSymbol, 
    exchange: "", 
    type: "", 
    isInWatchlist: false 
  };

  const isInWatchlist = await isStockInWatchlist(decodedSymbol);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Left Column */}
      <div className="flex flex-col gap-6">
        <TradingViewWidget
          title="Symbol Info"
          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js"
          config={SYMBOL_INFO_WIDGET_CONFIG(decodedSymbol)}
          height={200}
        />
        <TradingViewWidget
          title="Chart"
          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
          config={CANDLE_CHART_WIDGET_CONFIG(decodedSymbol)}
          height={500}
        />
        <TradingViewWidget
          title="Baseline"
          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" // Baseline usually uses same widget but different config/type
          config={BASELINE_WIDGET_CONFIG(decodedSymbol)}
          height={500}
        />
      </div>

      {/* Right Column */}
      <div className="flex flex-col gap-6">
        <WatchlistButton 
          symbol={decodedSymbol} 
          company={stockInfo.name} 
          initialIsInWatchlist={isInWatchlist} 
        />
        
        <TradingViewWidget
          title="Technical Analysis"
          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js"
          config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(decodedSymbol)}
          height={400}
        />
        <TradingViewWidget
          title="Company Profile"
          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js"
          config={COMPANY_PROFILE_WIDGET_CONFIG(decodedSymbol)}
          height={400}
        />
        <TradingViewWidget
          title="Financials"
          scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-financials.js"
          config={COMPANY_FINANCIALS_WIDGET_CONFIG(decodedSymbol)}
          height={500}
        />
      </div>
    </div>
  );
}

