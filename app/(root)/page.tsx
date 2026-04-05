'use client';

import useTradingViewWidget from '@/hooks/useTradingViewWidget';
import { memo } from 'react';
import TradingViewWidget from "@/components/TradingViewWidget"
import TradingViewScreenerWidget from "@/components/TradingViewScreenerWidget"
import TopMovers from "@/components/TopMovers"

import { MARKET_OVERVIEW_WIDGET_CONFIG, 
  STOCK_HEATMAP_WIDGET_CONFIG,
  TIMELINES_WIDGET_CONFIG,
  MARKET_DATA_WIDGET_CONFIG,
  TAPE_WIDGET_CONFIG,
  FOREX_HEATMAP_WIDGET_CONFIG,
 } from "@/lib/constants"

// Ticker Tape Widget (same as AuthRightSection)
function TickerTapeWidget() {
  const containerRef = useTradingViewWidget(
    'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js',
    TAPE_WIDGET_CONFIG,
    70
  );

  return (
    <div className="w-full">
      <div
        className="tradingview-widget-container"
        style={{ height: '70px', borderRadius: '12px', overflow: 'hidden' }}
        ref={containerRef}
      >
        <div className="tradingview-widget-container__widget" style={{ height: '70px', width: '100%' }} />
      </div>
    </div>
  );
}

const MemoizedTickerTape = memo(TickerTapeWidget);


const Home = () => {
  const scripturl = "https://s3.tradingview.com/external-embedding/embed-widget-";
  return (
    <div className="flex min-h-screen home-wrapper">
      {/* Tape Widget - Ticker at top with proper spacing below navbar */}
      <div className="w-full pt-4">
        <MemoizedTickerTape />
      </div>

      {/* Quick market snapshot */}
      <section className="w-full gap-8 home-section">
        <TopMovers />
      </section>

      {/* First row: Market Overview and Stock Heatmap */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full gap-8 home-section">
        {/* Market Overview */}
        <div className="md:col-span-1 xl:col-span-1">
          <TradingViewWidget title="Market Overview" scriptUrl={`${scripturl}market-overview.js`} config={MARKET_OVERVIEW_WIDGET_CONFIG} height={600} className="custom-chart"/>
        </div>
        {/* Stock Heatmap */}
        <div className="md:col-span-1 xl:col-span-2">
          <TradingViewWidget title="Stock Heatmap" scriptUrl={`${scripturl}stock-heatmap.js`} config={STOCK_HEATMAP_WIDGET_CONFIG} height={600} showBorder={false} transparent={true}/>
        </div>
      </section>

      {/* Second row: Market Data, Timeline, and Forex Heatmap */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full gap-8 home-section">
        {/* Market Data */}
        <div className="md:col-span-1 xl:col-span-2 h-full">
          <TradingViewWidget scriptUrl={`${scripturl}market-quotes.js`} config={MARKET_DATA_WIDGET_CONFIG} height={600}/>
        </div>
        {/* Timeline */}
        <div className="md:col-span-1 xl:col-span-1 h-full">
          <TradingViewWidget scriptUrl={`${scripturl}timeline.js`} config={TIMELINES_WIDGET_CONFIG} height={600} className="custom-chart"/>
        </div>
      </section>

      {/* Third row: Forex Heatmap */}
      <section className="w-full gap-8 home-section">
        <TradingViewWidget 
          title="Forex Heatmap" 
          scriptUrl={`${scripturl}forex-heat-map.js`} 
          config={FOREX_HEATMAP_WIDGET_CONFIG} 
          height={400}
          className="custom-chart"
          transparent={true}
        />
      </section>

      {/* Fourth row: Stock Screener */}
      <section className="w-full gap-8 home-section">
        <TradingViewScreenerWidget className="custom-chart" />
      </section>
    </div>
  )
}

export default Home
