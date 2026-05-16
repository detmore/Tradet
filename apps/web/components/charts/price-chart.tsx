"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  createSeriesMarkers,
  ColorType,
  LineStyle,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type IPriceLine,
  type Time,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type SeriesMarker,
} from "lightweight-charts";

export interface ChartMarker {
  time: Time;
  position: "aboveBar" | "belowBar";
  color: string;
  shape: "arrowUp" | "arrowDown" | "circle";
  text: string;
}

export interface PriceLevel {
  price: number;
  color: string;
  lineStyle?: 0 | 1 | 2;
  title?: string;
}

export interface EmaLine {
  period: number;
  color: string;
  data: LineData<Time>[];
}

interface PriceChartProps {
  candles: CandlestickData<Time>[];
  volume?: HistogramData<Time>[];
  markers?: ChartMarker[];
  levels?: PriceLevel[];
  emas?: EmaLine[];
  height?: number;
  showVolume?: boolean;
  /** How many candles to show in the visible window. undefined = fitContent */
  visibleCandles?: number;
}

export function PriceChart({
  candles,
  volume = [],
  markers = [],
  levels = [],
  emas = [],
  height = 460,
  showVolume = true,
  visibleCandles,
}: PriceChartProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const chartRef      = useRef<IChartApi | null>(null);
  const candleRef      = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef      = useRef<ISeriesApi<"Histogram"> | null>(null);
  const emaRefs        = useRef<ISeriesApi<"Line">[]>([]);
  const priceLinesRef  = useRef<IPriceLine[]>([]);
  const markersPlugin  = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  // Build chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height,
      localization: {
        timeFormatter: (timestamp: number) =>
          new Date(timestamp * 1000).toLocaleTimeString("tr-TR", {
            timeZone: "Europe/Istanbul",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
        dateFormat: "dd MMM",
      },
      layout: {
        background: { type: ColorType.Solid, color: "#0c0c0d" },
        textColor:  "#57534e",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize:   11,
      },
      grid: {
        vertLines: { color: "#1a1a1e", style: LineStyle.Solid },
        horzLines: { color: "#1a1a1e", style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(245,165,0,0.4)",
          labelBackgroundColor: "#1a1a1e",
          style: LineStyle.Dashed,
          width: 1,
        },
        horzLine: {
          color: "rgba(245,165,0,0.4)",
          labelBackgroundColor: "#1a1a1e",
          style: LineStyle.Dashed,
          width: 1,
        },
      },
      rightPriceScale: {
        borderColor:  "#1a1a1e",
        textColor:    "#57534e",
        scaleMargins: showVolume ? { top: 0.08, bottom: 0.22 } : { top: 0.08, bottom: 0.04 },
        autoScale:    true,
      },
      timeScale: {
        borderColor:    "#1a1a1e",
        timeVisible:    true,
        secondsVisible: false,
        rightOffset:    6,
        barSpacing:     8,
        fixLeftEdge:    false,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll: true,
      handleScale:  true,
    });

    // Candlestick series (v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:        "#00e676",
      downColor:      "#ff3b3b",
      borderUpColor:  "#00e676",
      borderDownColor:"#ff3b3b",
      wickUpColor:    "#00e676",
      wickDownColor:  "#ff3b3b",
    });

    // Volume series
    let volSeries: ISeriesApi<"Histogram"> | null = null;
    if (showVolume) {
      volSeries = chart.addSeries(HistogramSeries, {
        color:        "rgba(245,165,0,0.18)",
        priceFormat:  { type: "volume" },
        priceScaleId: "volume",
      });
      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
        visible:      false,
      });
    }

    chartRef.current     = chart;
    candleRef.current    = candleSeries;
    volumeRef.current    = volSeries;
    emaRefs.current      = [];
    markersPlugin.current = null;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current      = null;
      candleRef.current     = null;
      volumeRef.current     = null;
      emaRefs.current       = [];
      priceLinesRef.current = [];
      markersPlugin.current = null;
    };
  }, [height, showVolume]);

  // Candles
  useEffect(() => {
    if (!candleRef.current || candles.length === 0) return;
    candleRef.current.setData(candles);
    const ts = chartRef.current?.timeScale();
    if (!ts) return;
    if (visibleCandles && candles.length > visibleCandles) {
      const to   = candles.length - 1;
      const from = to - visibleCandles + 1;
      ts.setVisibleLogicalRange({ from, to });
    } else {
      ts.fitContent();
    }
  }, [candles, visibleCandles]);

  // Volume
  useEffect(() => {
    if (!volumeRef.current || volume.length === 0) return;
    const coloredVol = volume.map((v, i) => {
      const candle = candles[i];
      return {
        ...v,
        color: candle
          ? (candle.close >= candle.open
              ? "rgba(0,204,68,0.25)"
              : "rgba(255,51,51,0.25)")
          : "rgba(245,165,0,0.18)",
      };
    });
    volumeRef.current.setData(coloredVol);
  }, [volume, candles]);

  // Markers (v5: createSeriesMarkers plugin)
  useEffect(() => {
    if (!candleRef.current) return;
    const lwMarkers: SeriesMarker<Time>[] = markers.map((m) => ({
      time:     m.time,
      position: m.position,
      color:    m.color,
      shape:    m.shape,
      text:     m.text,
      size:     1,
    }));
    if (markersPlugin.current) {
      markersPlugin.current.setMarkers(lwMarkers);
    } else {
      markersPlugin.current = createSeriesMarkers(candleRef.current, lwMarkers);
    }
  }, [markers]);

  // EMA lines
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const s of emaRefs.current) chart.removeSeries(s);
    emaRefs.current = [];
    for (const ema of emas) {
      const line = chart.addSeries(LineSeries, {
        color:                  ema.color,
        lineWidth:              1,
        crosshairMarkerVisible: false,
        priceLineVisible:       false,
        lastValueVisible:       false,
      });
      line.setData(ema.data);
      emaRefs.current.push(line);
    }
  }, [emas]);

  // Price levels (SL/TP/entry)
  useEffect(() => {
    const series = candleRef.current;
    if (!series) return;
    for (const pl of priceLinesRef.current) series.removePriceLine(pl);
    priceLinesRef.current = [];
    const styleMap = [LineStyle.Solid, LineStyle.Dotted, LineStyle.Dashed] as const;
    for (const lv of levels) {
      const pl = series.createPriceLine({
        price:            lv.price,
        color:            lv.color,
        lineWidth:        1,
        lineStyle:        styleMap[lv.lineStyle ?? 2],
        axisLabelVisible: true,
        title:            lv.title ?? "",
      });
      priceLinesRef.current.push(pl);
    }
  }, [levels]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, background: "#0c0c0d" }}
    />
  );
}
