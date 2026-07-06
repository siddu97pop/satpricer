"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LineChart, { ChartDataset } from "@/components/LineChart";
import OutcomeCard from "@/components/OutcomeCard";
import {
  buildInvestment,
  fetchPairData,
  thin,
  InvestMode,
  PairRow,
  RANGE_MAP,
  Timeframe,
  TIMEFRAMES,
} from "@/lib/data";
import { fmtBtcRatio, fmtSats, fmtUSD, fmtUSDCompact, pct, retColor } from "@/lib/format";

const QUICK_TICKERS = ["AAPL", "TSLA", "MSFT", "NVDA", "AMZN", "INTC"];

const RATIO_UNITS = [
  { key: "btc",  label: "BTC", get: (r: PairRow) => r.stockUSD / r.btcUSD,         color: "#f97316", fmt: fmtBtcRatio, onClass: "seg-btn-on" },
  { key: "sats", label: "SAT", get: (r: PairRow) => (r.stockUSD / r.btcUSD) * 1e8, color: "#eab308", fmt: fmtSats,     onClass: "seg-btn-on-gold" },
  { key: "usd",  label: "USD", get: (r: PairRow) => r.stockUSD,                    color: "#60a5fa", fmt: fmtUSD,      onClass: "seg-btn-on-blue" },
] as const;

function Skeleton({ className }: { className: string }) {
  return <div className={`rounded-md bg-card-2 anim-pulse-soft ${className}`} />;
}

export default function Home() {
  const [ticker, setTicker] = useState("AAPL");
  const [input, setInput] = useState("AAPL");
  const [tf, setTf] = useState<Timeframe>("1Y");
  const [amount, setAmount] = useState(1000);
  const [amtIn, setAmtIn] = useState("1000");
  const [mode, setMode] = useState<InvestMode>("lump");
  const [denom, setDenom] = useState<"usd" | "sats">("usd");
  const [view, setView] = useState<"invest" | "ratio">("invest");
  const [unitKey, setUnitKey] = useState<(typeof RATIO_UNITS)[number]["key"]>("btc");
  const [data, setData] = useState<PairRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (t: string, timeframe: Timeframe) => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPairData(t, timeframe));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(ticker, tf); }, [ticker, tf, load]);

  // Simulation — no refetch on amount/mode/denom changes
  const sim = useMemo(
    () => (data && data.length ? buildInvestment(data, { mode, amount }) : null),
    [data, mode, amount]
  );
  const s = sim?.summary;

  const inSats = denom === "sats";
  const fmtMain = inSats ? fmtSats : fmtUSD;
  const fmtAxis = inSats ? fmtSats : fmtUSDCompact;

  const investThin = useMemo(() => (sim ? thin(sim.series) : []), [sim]);
  const investChart = useMemo(() => {
    if (!investThin.length) return null;
    const radii = mode === "dca" ? investThin.map(r => (r.isPurchase ? 3.5 : 0)) : 0;
    const datasets: ChartDataset[] = [
      { label: "BTC position",       data: investThin.map(r => (inSats ? r.btcValSats : r.btcValUSD)),     color: "#f97316", fill: true },
      { label: `${ticker} position`, data: investThin.map(r => (inSats ? r.stockValSats : r.stockValUSD)), color: "#60a5fa", fill: false, pointRadii: radii },
    ];
    return { labels: investThin.map(r => r.dateLabel), datasets };
  }, [investThin, inSats, ticker, mode]);

  const ratioUnit = RATIO_UNITS.find(u => u.key === unitKey)!;
  const ratioThin = useMemo(() => (data ? thin(data) : []), [data]);
  const ratioChart = useMemo(() => {
    if (!ratioThin.length) return null;
    const datasets: ChartDataset[] = [{ label: null, data: ratioThin.map(ratioUnit.get), color: ratioUnit.color, fill: true }];
    return { labels: ratioThin.map(r => r.dateLabel), datasets };
  }, [ratioThin, ratioUnit]);

  const last = data?.[data.length - 1];

  // IPO / short-history note
  const ipoNote = useMemo(() => {
    const days = RANGE_MAP[tf].days;
    if (!data || !days) return null;
    const expectedStart = Date.now() / 1000 - days * 86400;
    if (data[0].ts > expectedStart + 35 * 86400) {
      const d = new Date(data[0].ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `Data begins ${d} — simulation starts there.`;
    }
    return null;
  }, [data, tf]);

  const submit = () => { const t = input.trim().toUpperCase(); if (t) setTicker(t); };
  const commitAmount = () => {
    const v = parseFloat(amtIn.replace(/[^0-9.]/g, ""));
    if (isNaN(v) || v < 1) { setAmtIn(String(amount)); return; }
    setAmount(v);
    setAmtIn(String(v));
  };

  const stats = s && last ? [
    {
      label: `${ticker} Price`,
      val: inSats ? fmtSats((last.stockUSD / last.btcUSD) * 1e8) : fmtUSD(last.stockUSD),
      sub: inSats ? fmtUSD(last.stockUSD) : fmtSats((last.stockUSD / last.btcUSD) * 1e8),
      cls: "text-white",
    },
    {
      label: "Bitcoin Price",
      val: "$" + Math.round(last.btcUSD).toLocaleString(),
      sub: "always in USD",
      cls: "text-accent",
    },
    {
      label: "Total Invested",
      val: fmtMain(inSats ? s.investedSats : s.investedUSD),
      sub: mode === "dca" ? `${fmtUSD(amount)}/mo × ${s.purchases} buys` : "lump sum at start",
      cls: "text-white",
    },
    {
      label: `${ticker} Position`,
      val: fmtMain(inSats ? s.stockFinalSats : s.stockFinalUSD),
      sub: `${s.shares.toFixed(3)} shares`,
      cls: "text-bluec",
    },
    {
      label: "BTC Position",
      val: fmtMain(inSats ? s.btcFinalSats : s.btcFinalUSD),
      sub: `${s.btcAcquired.toFixed(5)} BTC acquired`,
      cls: "text-accent-2",
    },
    {
      label: "Difference",
      val: (s.deltaUSD >= 0 ? "+" : "−") + fmtMain(Math.abs(inSats ? s.deltaSats : s.deltaUSD)),
      sub: `${ticker} vs BTC · ${pct(inSats ? s.deltaSatsPct : s.deltaPct)}`,
      cls: retColor(s.deltaUSD),
    },
  ] : [];

  const stockFinal = inSats ? s?.stockFinalSats : s?.stockFinalUSD;
  const btcFinal = inSats ? s?.btcFinalSats : s?.btcFinalUSD;
  const stockRet = inSats ? s?.stockRetSatsPct : s?.stockRetPct;
  const btcRet = inSats ? 0 : s?.btcRetPct;

  return (
    <div className="min-h-dvh pb-14">
      {/* Header */}
      <header className="border-b border-borderc bg-bg/90">
        <div className="max-w-[1100px] mx-auto px-6 max-sm:px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-disp text-[23px] font-bold tracking-tight">
              <span className="text-accent">₿</span> SatPricer
            </h1>
            <p className="mt-[3px] text-xs text-muted-2">What if you&apos;d bought Bitcoin instead?</p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="font-mono text-xs text-muted bg-card px-[13px] py-2 rounded-lg border border-borderc tabular-nums">
              BTC · {last ? "$" + Math.round(last.btcUSD).toLocaleString() : "—"}
            </div>
            <div className="seg" role="group" aria-label="Denomination">
              <button className={`seg-btn ${!inSats ? "seg-btn-on" : ""}`} onClick={() => setDenom("usd")}>$ USD</button>
              <button className={`seg-btn ${inSats ? "seg-btn-on" : ""}`} onClick={() => setDenom("sats")}>₿ SATS</button>
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="max-w-[1100px] mx-auto px-6 max-sm:px-4 pt-[22px] pb-3.5">
        <div className="flex gap-2.5 items-center flex-wrap">
          <input
            className="txt-in w-[110px]"
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Ticker"
            aria-label="Stock ticker"
          />
          <div className="seg" role="group" aria-label="Timeframe">
            {TIMEFRAMES.map(t => (
              <button key={t} className={`seg-btn ${tf === t ? "seg-btn-on" : ""}`} onClick={() => setTf(t)}>{t}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={submit}>Compare →</button>
        </div>

        <div className="flex gap-2.5 items-center flex-wrap mt-3">
          <div className="relative">
            <span className="absolute left-[13px] top-1/2 -translate-y-1/2 font-mono text-muted-2 text-sm">$</span>
            <input
              className="txt-in w-[130px] pl-[26px]"
              value={amtIn}
              inputMode="decimal"
              onChange={e => setAmtIn(e.target.value)}
              onBlur={commitAmount}
              onKeyDown={e => { if (e.key === "Enter") { commitAmount(); (e.target as HTMLInputElement).blur(); } }}
              aria-label={mode === "dca" ? "Amount invested per month in dollars" : "Amount invested in dollars"}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 text-[11px]">
              {mode === "dca" ? "/mo" : ""}
            </span>
          </div>

          <div className="seg" role="group" aria-label="Investment mode">
            <button className={`seg-btn ${mode === "lump" ? "seg-btn-on" : ""}`} onClick={() => setMode("lump")}>Lump Sum</button>
            <button className={`seg-btn ${mode === "dca" ? "seg-btn-on" : ""}`} onClick={() => setMode("dca")}>DCA Monthly</button>
          </div>

          {mode === "dca" && s && !loading && (
            <span className="font-mono text-xs text-muted tabular-nums">
              {s.purchases} purchases · {fmtUSD(s.investedUSD)} total
            </span>
          )}
        </div>

        <div className="flex gap-1.5 mt-3 flex-wrap">
          {QUICK_TICKERS.map(t => (
            <button key={t} className={`chip ${ticker === t ? "chip-on" : ""}`} onClick={() => { setInput(t); setTicker(t); }}>{t}</button>
          ))}
        </div>

        {ipoNote && !loading && <p className="mt-3 text-xs text-gold">⚠ {ipoNote}</p>}
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="max-w-[1100px] mx-auto px-6 max-sm:px-4 pb-5">
          <div className="bg-redc/[0.07] border border-redc/25 rounded-[14px] px-5 py-4" role="alert">
            <p className="mb-1 text-[11px] font-bold text-redc uppercase tracking-[0.08em]">Error</p>
            <p className="text-[13px] text-muted">{error} — check the ticker symbol and try again.</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="max-w-[1100px] mx-auto px-6 max-sm:px-4 pt-1 pb-[18px] grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card px-4 py-3.5 flex flex-col gap-2">
                <Skeleton className="w-3/5 h-2.5" />
                <Skeleton className="w-4/5 h-5" />
              </div>
            ))
          : stats.map((st, i) => (
              <div key={i} className="card card-lift px-4 py-3.5">
                <p className="lbl">{st.label}</p>
                <p className={`font-mono font-bold text-base tabular-nums ${st.cls}`}>{st.val}</p>
                {st.sub && <p className="mt-1 font-mono text-[11px] text-muted-2 tabular-nums">{st.sub}</p>}
              </div>
            ))}
      </div>

      {/* Chart + Verdict */}
      <div className="max-w-[1100px] mx-auto px-6 max-sm:px-4 flex flex-col gap-4">
        <div className="card px-6 py-5 max-sm:px-4">
          <div className="flex items-start justify-between mb-3.5 flex-wrap gap-2.5">
            <div>
              <h3 className="font-disp text-base font-semibold mb-1">
                {view === "invest"
                  ? `${fmtUSD(amount)}${mode === "dca" ? "/mo" : ""} in ${ticker} vs Bitcoin — ${tf}`
                  : `${ticker} priced in ${ratioUnit.label} — ${tf}`}
              </h3>
              <p className="text-xs text-muted">
                {view === "invest"
                  ? inSats
                    ? "Measured in sats, the BTC position is your flat benchmark — the stock line wiggles against it."
                    : "Both positions valued in USD over time. Orange area = the BTC benchmark."
                  : unitKey === "usd"
                    ? `${ticker} share price in US dollars.`
                    : unitKey === "btc"
                      ? `How many Bitcoin is one ${ticker} share worth?`
                      : "BTC ratio expressed in satoshis (1 BTC = 100,000,000 sats)."}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <div className="seg" role="group" aria-label="Chart view">
                <button className={`seg-btn ${view === "invest" ? "seg-btn-on" : ""}`} onClick={() => setView("invest")}>Investment</button>
                <button className={`seg-btn ${view === "ratio" ? "seg-btn-on" : ""}`} onClick={() => setView("ratio")}>Ratio</button>
              </div>
              {view === "ratio" && (
                <div className="seg" role="group" aria-label="Ratio unit">
                  {RATIO_UNITS.map(u => (
                    <button key={u.key} className={`seg-btn ${unitKey === u.key ? u.onClass : ""}`} onClick={() => setUnitKey(u.key)}>
                      {u.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="h-[300px] max-sm:h-[240px] flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-[3px] border-borderc border-t-accent rounded-full anim-spin" />
                <p className="text-muted-2 text-xs">Loading real data…</p>
              </div>
            ) : view === "invest" && investChart ? (
              <div className="w-full h-full flex flex-col">
                <div className="flex justify-end gap-4 pb-2">
                  {investChart.datasets.map(ds => (
                    <span key={ds.label} className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ds.color }} aria-hidden />
                      {ds.label}
                    </span>
                  ))}
                </div>
                <div className="flex-1 min-h-0">
                  <LineChart labels={investChart.labels} datasets={investChart.datasets} fmt={fmtAxis} />
                </div>
              </div>
            ) : view === "ratio" && ratioChart ? (
              <div className="w-full h-full">
                <LineChart labels={ratioChart.labels} datasets={ratioChart.datasets} fmt={ratioUnit.fmt} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Verdict */}
        {!loading && s && stockFinal != null && btcFinal != null && stockRet != null && btcRet != null && (
          <>
            <div className="flex gap-3 flex-wrap max-sm:flex-col">
              <OutcomeCard
                title={`${ticker} route`}
                icon="▲"
                iconClass="text-bluec"
                path={mode === "dca"
                  ? `${fmtUSD(amount)}/mo × ${s.purchases} → ${s.shares.toFixed(3)} shares`
                  : `${fmtUSD(s.investedUSD)} → ${s.shares.toFixed(3)} shares`}
                finalVal={stockFinal}
                retPct={stockRet}
                isWinner={s.winner === "stock"}
                note={inSats ? "in sats" : null}
                fmt={fmtMain}
              />
              <OutcomeCard
                title="Bitcoin route"
                icon="₿"
                iconClass="text-accent"
                path={mode === "dca"
                  ? `${fmtUSD(amount)}/mo × ${s.purchases} → ${s.btcAcquired.toFixed(5)} BTC`
                  : `${fmtUSD(s.investedUSD)} → ${s.btcAcquired.toFixed(5)} BTC`}
                finalVal={btcFinal}
                retPct={btcRet}
                isWinner={s.winner === "btc"}
                note={inSats ? "your benchmark — 0% by definition" : null}
                fmt={fmtMain}
              />
            </div>

            <div className="card bg-card-2 px-5 py-3.5 flex items-center gap-2.5 flex-wrap">
              <span className="text-[11px] font-bold text-accent uppercase tracking-[0.08em]">Verdict</span>
              <p className="text-[13px] text-muted leading-relaxed">
                Over {tf}, the{" "}
                <strong className={s.winner === "stock" ? "text-bluec" : "text-accent-2"}>
                  {s.winner === "stock" ? ticker : "Bitcoin"} position
                </strong>{" "}
                comes out ahead by{" "}
                <strong className="font-mono text-white tabular-nums">
                  {fmtMain(Math.abs(inSats ? s.deltaSats : s.deltaUSD))} ({Math.abs(inSats ? s.deltaSatsPct : s.deltaPct).toFixed(1)}%)
                </strong>.
                {inSats && s.winner === "btc" && " In a Bitcoin-denominated world, this stock lost you sats."}
                {inSats && s.winner === "stock" && " Even measured in sats, this stock beat holding Bitcoin."}
              </p>
            </div>
          </>
        )}

        <p className="text-center text-[11px] text-muted-2 opacity-70 pb-2">
          v6 · Live data via Yahoo Finance · Prices delayed ~15 min · Excludes dividends; buys use daily/weekly closes
        </p>
      </div>
    </div>
  );
}
