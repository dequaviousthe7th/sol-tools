'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface TimeRange {
  label: string;
  seconds: number; // 0 = Max
}

interface TradingChartProps {
  type: 'area' | 'candlestick' | 'baseline';
  data: Array<Record<string, number>>;
  height?: number;
  mobileHeight?: number;
  color?: 'green' | 'red' | 'cyan';
  ranges?: TimeRange[];
  loading?: boolean;
  priceFormatter?: (price: number) => string;
  hideGrid?: boolean;
}

const COLOR_MAP = {
  green: { line: '#22c55e', top: 'rgba(34, 197, 94, 0.25)', bottom: 'rgba(34, 197, 94, 0)' },
  red:   { line: '#ef4444', top: 'rgba(239, 68, 68, 0.25)', bottom: 'rgba(239, 68, 68, 0)' },
  cyan:  { line: '#06b6d4', top: 'rgba(6, 182, 212, 0.25)', bottom: 'rgba(6, 182, 212, 0)' },
};

function defaultFormatPrice(n: number): string {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  if (abs >= 1) return `$${n.toFixed(2)}`;
  if (abs >= 0.01) return `$${n.toFixed(4)}`;
  if (abs >= 0.000001) return `$${n.toFixed(6)}`;
  return `$${n.toExponential(2)}`;
}

export default function TradingChart({
  type,
  data,
  height = 280,
  mobileHeight = 200,
  color = 'green',
  ranges,
  loading = false,
  priceFormatter,
  hideGrid = false,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [activeRange, setActiveRange] = useState<string>(ranges?.[ranges.length - 1]?.label || 'Max');
  const [isMobile, setIsMobile] = useState(false);
  const latestDataRef = useRef(data);
  latestDataRef.current = data;
  const hasData = data.length > 0;
  const formatFn = priceFormatter || defaultFormatPrice;
  const formatFnRef = useRef(formatFn);
  formatFnRef.current = formatFn;

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
  }, []);

  // Create chart (re-runs when type/color/height changes or data first becomes available)
  useEffect(() => {
    if (!containerRef.current || !hasData) return;

    // If chart already exists, just update data
    if (chartRef.current && seriesRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      seriesRef.current.setData(latestDataRef.current as any);
      return;
    }

    let cancelled = false;

    (async () => {
      const lc = await import('lightweight-charts');
      if (cancelled || !containerRef.current) return;

      containerRef.current.innerHTML = '';

      const chartHeight = isMobile ? mobileHeight : height;
      const fmt = formatFnRef.current;

      const chart = lc.createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: chartHeight,
        layout: {
          background: { type: lc.ColorType.Solid, color: '#111113' },
          textColor: '#6b7280',
          fontSize: 11,
        },
        grid: hideGrid
          ? { vertLines: { visible: false }, horzLines: { visible: false } }
          : { vertLines: { color: '#222228' }, horzLines: { color: '#222228' } },
        crosshair: {
          mode: lc.CrosshairMode.Magnet,
        },
        rightPriceScale: {
          borderVisible: !hideGrid,
          borderColor: '#222228',
        },
        timeScale: {
          borderVisible: !hideGrid,
          borderColor: '#222228',
          timeVisible: true,
          secondsVisible: false,
          fixLeftEdge: true,
          fixRightEdge: true,
        },
        handleScroll: { vertTouchDrag: false },
        localization: {
          priceFormatter: fmt,
        },
      });

      if (cancelled) {
        chart.remove();
        return;
      }

      const colors = COLOR_MAP[color];

      let series;
      if (type === 'baseline') {
        series = chart.addSeries(lc.BaselineSeries, {
          baseValue: { type: 'price', price: 0 },
          topLineColor: '#22c55e',
          topFillColor1: 'rgba(34, 197, 94, 0.3)',
          topFillColor2: 'rgba(34, 197, 94, 0)',
          bottomLineColor: '#e84482',
          bottomFillColor1: 'rgba(232, 68, 130, 0)',
          bottomFillColor2: 'rgba(232, 68, 130, 0.3)',
          lineWidth: 2,
          crosshairMarkerRadius: 4,
          crosshairMarkerBorderColor: '#e84482',
          crosshairMarkerBackgroundColor: '#111113',
        });
      } else if (type === 'area') {
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

      series.applyOptions({
        priceFormat: {
          type: 'custom',
          formatter: fmt,
        },
        lastValueVisible: true,
        priceLineVisible: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      series.setData(latestDataRef.current as any);
      chart.timeScale().fitContent();

      chartRef.current = chart;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      seriesRef.current = series as any;

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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, color, height, mobileHeight, isMobile, hasData, hideGrid]);

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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      setActiveRange(ranges?.[ranges.length - 1]?.label || 'Max');
    }
  }, [ranges]);

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
    <div className="card overflow-hidden" onContextMenu={handleContextMenu}>
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
