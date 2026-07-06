"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Legend,
  Tooltip,
} from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Legend, Tooltip);

export interface ChartDataset {
  label: string | null;
  data: number[];
  color: string;
  fill: boolean;
  pointRadii?: number[] | number;
}

interface LineChartProps {
  labels: string[];
  datasets: ChartDataset[];
  fmt: (v: number) => string;
}

export default function LineChart({ labels, datasets, fmt }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Canvas can't resolve CSS variables — read the next/font family name from the body
    const monoFont = getComputedStyle(document.body).getPropertyValue("--font-jetbrains-mono").trim() || "monospace";

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: datasets.map(ds => {
          let bg: CanvasGradient | string = "transparent";
          if (ds.fill) {
            const grad = ctx.createLinearGradient(0, 0, 0, 300);
            grad.addColorStop(0, ds.color + "40");
            grad.addColorStop(1, ds.color + "00");
            bg = grad;
          }
          return {
            label: ds.label ?? undefined,
            data: ds.data,
            borderColor: ds.color,
            borderWidth: 2,
            backgroundColor: bg,
            fill: ds.fill,
            tension: 0.3,
            pointRadius: ds.pointRadii ?? 0,
            pointBackgroundColor: ds.color,
            pointBorderColor: "#030712",
            pointHoverRadius: 5,
            pointHoverBackgroundColor: ds.color,
          };
        }),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0d1117",
            borderColor: "#243044",
            borderWidth: 1,
            titleColor: "#9ca3af",
            bodyColor: "#f3f4f6",
            bodyFont: { family: monoFont, weight: 700, size: 12 },
            padding: 12,
            callbacks: {
              label: c => ` ${c.dataset.label ? c.dataset.label + ": " : ""}${fmt(c.parsed.y ?? 0)}`,
            },
          },
        },
        scales: {
          x: { grid: { color: "#111827" }, ticks: { color: "#6b7280", font: { size: 11 }, maxTicksLimit: 7 } },
          y: {
            grid: { color: "#111827" },
            ticks: {
              color: "#6b7280",
              font: { size: 11, family: monoFont },
              maxTicksLimit: 5,
              callback: v => fmt(Number(v)),
            },
          },
        },
      },
    });

    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [labels, datasets, fmt]);

  return <canvas ref={canvasRef} className="w-full h-full" aria-label="Investment performance chart" role="img" />;
}
