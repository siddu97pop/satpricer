"use client";

import { useEffect, useState } from "react";
import { pct, retColor } from "@/lib/format";

// Count-up animation for verdict headline numbers
function useCountUp(target: number, dur = 700) {
  const [val, setVal] = useState(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setVal(target); return; }
    let raf: number;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(target * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return val;
}

interface OutcomeCardProps {
  title: string;
  icon: string;
  iconClass: string;
  path: string;
  finalVal: number;
  retPct: number;
  isWinner: boolean;
  note?: string | null;
  fmt: (v: number) => string;
}

export default function OutcomeCard({ title, icon, iconClass, path, finalVal, retPct, isWinner, note, fmt }: OutcomeCardProps) {
  const animated = useCountUp(finalVal);
  return (
    <div
      className={`card relative flex-1 min-w-[240px] px-[22px] py-5 ${
        isWinner ? "winner-glow border-accent/40" : "opacity-[0.82]"
      }`}
    >
      {isWinner && (
        <span className="absolute top-3.5 right-3.5 text-[10px] font-bold tracking-[0.1em] text-bg bg-accent px-[9px] py-[3px] rounded-[5px]">
          WINNER
        </span>
      )}
      <p className={`lbl ${iconClass}`}>{icon} {title}</p>
      <p className="mt-0.5 mb-2 text-[13px] text-muted leading-normal">{path}</p>
      <p className="font-disp text-[30px] font-bold tracking-tight text-white tabular-nums">{fmt(animated)}</p>
      <p className={`mt-1 font-mono text-sm font-bold ${retColor(retPct)}`}>
        {pct(retPct)}
        {note && <span className="ml-2 text-[11px] font-medium text-muted-2">{note}</span>}
      </p>
    </div>
  );
}
