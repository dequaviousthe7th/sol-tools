'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface TimeRange {
  label: string;
  seconds: number; // 0 = Max
}

interface TradingChartProps {
  type: 'area' | 'candlestick';
  data: Array<Record<string, number>>;
  height?: number;
  mobileHeight?: number;
  color?: 'green' | 'red' | 'cyan';
  ranges?: TimeRange[];
  loading?: boolean;
}

const COLOR_MAP = {
  green: { line: '#22c55e', top: 'rgba(34, 197, 94, 0.25)', bottom: 'rgba(34, 197, 94, 0)' },
  red:   { line: '#ef4444', top: 'rgba(239, 68, 68, 0.25)', bottom: 'rgba(239, 68, 68, 0)' },
  cyan:  { line: '#06b6d4', top: 'rgba(6, 182, 212, 0.25)', bottom: 'rgba(6, 182, 212, 0)' },
};

export default function TradingChart({
  type,
  data,
  height = 280,
  mobileHeight = 200,
  color = 'green',
  ranges,
  loading = false,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [activeRange, setActiveRange] = useState<string>(ranges?.[ranges.length - 1]?.label || 'Max');
  const [isMobile, setIsMobile] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);

  // Create chart once
  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    // If chart already exists, just update data
    if (chartRef.current && seriesRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      seriesRef.current.setData(data as any);
      return;
    }

    let cancelled = false;

    (async () => {
      const lc = await import('lightweight-charts');
      if (cancelled || !containerRef.current) return;

      // Clear any leftover children (safety)
      containerRef.current.innerHTML = '';

      const chartHeight = isMobile ? mobileHeight : height;

      const chart = lc.createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: chartHeight,
        layout: {
          background: { type: lc.ColorType.Solid, color: '#111113' },
          textColor: '#6b7280',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: '#222228' },
          horzLines: { color: '#222228' },
        },
        crosshair: {
          mode: lc.CrosshairMode.Magnet,
        },
        rightPriceScale: {
          borderColor: '#222228',
        },
        timeScale: {
          borderColor: '#222228',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { vertTouchDrag: false },
      });

      if (cancelled) {
        chart.remove();
        return;
      }

      const colors = COLOR_MAP[color];

      let series;
      if (type === 'area') {
        series = chart.addSeries(lc.AreaSeries, {
          lineColor: colors.line,
          topColor: colors.top,
          bottomColor: colors.bottom,
          lineWidth: 2,
          crosshairMarkerRadius: 4,
          crosshairMarkerBorderColor: colors.line,
          crosshairMarkerBackgroundColor: '#111113',
        });
      } else {
        series = chart.addSeries(lc.CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      series.setData(data as any);
      chart.timeScale().fitContent();

      chartRef.current = chart;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      seriesRef.current = series as any;
      initRef.current = true;

      const observer = new ResizeObserver(entries => {
        if (chartRef.current && entries[0]) {
          chartRef.current.applyOptions({ width: entries[0].contentRect.width });
        }
      });
      observer.observe(containerRef.current);
      observerRef.current = observer;
    })();

    return () => {
      cancelled = true;
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesRef.current = null;
      initRef.current = false;
    };
  // Re-create chart only on type/color/height change, not on data change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, color, height, mobileHeight, isMobile]);

  // Update data without re-creating chart
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      seriesRef.current.setData(data as any);
    }
  }, [data]);

  const handleRange = useCallback((range: TimeRange) => {
    setActiveRange(range.label);
    if (!chartRef.current || data.length === 0) return;

    if (range.seconds === 0) {
      chartRef.current.timeScale().fitContent();
      return;
    }

    const lastTime = data[data.length - 1].time;
    const from = lastTime - range.seconds;
    chartRef.current.timeScale().setVisibleRange({ from, to: lastTime });
  }, [data]);

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div
          className="bg-[#111113] shimmer"
          style={{ height: isMobile ? mobileHeight : height }}
        />
      </div>
    );
  }

  if (data.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      {ranges && ranges.length > 0 && (
        <div className="flex items-center gap-1 px-3 pt-3 pb-1">
          {ranges.map(r => (
            <button
              key={r.label}
              onClick={() => handleRange(r)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wider transition-all ${
                activeRange === r.label
                  ? 'bg-white/10 text-white'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
