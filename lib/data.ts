export interface PairRow {
  ts: number;
  dateLabel: string;
  stockUSD: number;
  btcUSD: number;
}

export interface SimRow {
  ts: number;
  dateLabel: string;
  stockValUSD: number;
  btcValUSD: number;
  stockValSats: number;
  btcValSats: number;
  isPurchase: boolean;
}

export interface SimSummary {
  investedUSD: number;
  investedSats: number;
  purchases: number;
  shares: number;
  btcAcquired: number;
  stockFinalUSD: number;
  btcFinalUSD: number;
  stockFinalSats: number;
  btcFinalSats: number;
  stockRetPct: number;
  btcRetPct: number;
  stockRetSatsPct: number;
  deltaUSD: number;
  deltaSats: number;
  deltaPct: number;
  deltaSatsPct: number;
  winner: "stock" | "btc";
}

export type InvestMode = "lump" | "dca";

export const RANGE_MAP = {
  "1M":  { range: "1mo", interval: "1d",  days: 31 },
  "3M":  { range: "3mo", interval: "1d",  days: 92 },
  "6M":  { range: "6mo", interval: "1wk", days: 183 },
  "1Y":  { range: "1y",  interval: "1wk", days: 366 },
  "3Y":  { range: "3y",  interval: "1wk", days: 1096 },
  "5Y":  { range: "5y",  interval: "1wk", days: 1827 },
  "Max": { range: "max", interval: "1mo", days: null },
} as const;

export type Timeframe = keyof typeof RANGE_MAP;
export const TIMEFRAMES = Object.keys(RANGE_MAP) as Timeframe[];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://satpricer-api.lexitools.tech";

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
    error?: { description?: string };
  };
}

async function fetchYahoo(symbol: string, range: string, interval: string) {
  const res = await fetch(`${API_BASE}/chart/${symbol}?interval=${interval}&range=${range}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${symbol}`);
  const json: YahooChartResponse = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    throw new Error(json?.chart?.error?.description || `No data returned for "${symbol}"`);
  }
  const ts = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  return ts
    .map((t, i) => ({ ts: t, price: closes[i] }))
    .filter((d): d is { ts: number; price: number } => d.price != null);
}

// BTC price for a timestamp, tolerant to ±5 days (weekends/holidays)
function lookupBtc(btcMap: Record<string, number>, ts: number): number | null {
  for (let delta = 0; delta <= 5; delta++) {
    for (const sign of [0, 1, -1]) {
      const d = new Date((ts + sign * delta * 86400) * 1000);
      const key = d.toISOString().slice(0, 10);
      if (btcMap[key] != null) return btcMap[key];
    }
  }
  return null;
}

export async function fetchPairData(ticker: string, tf: Timeframe): Promise<PairRow[]> {
  const { range, interval } = RANGE_MAP[tf];
  const [stockRaw, btcRaw] = await Promise.all([
    fetchYahoo(ticker, range, interval),
    fetchYahoo("BTC-USD", range, interval),
  ]);

  const btcMap: Record<string, number> = {};
  btcRaw.forEach(({ ts, price }) => {
    btcMap[new Date(ts * 1000).toISOString().slice(0, 10)] = price;
  });

  const rows: PairRow[] = [];
  stockRaw.forEach(({ ts, price }) => {
    const btcPrice = lookupBtc(btcMap, ts);
    if (!btcPrice) return;
    rows.push({
      ts,
      dateLabel: new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
      stockUSD: price,
      btcUSD: btcPrice,
    });
  });

  if (rows.length === 0) throw new Error("No aligned data points — BTC and stock dates may not overlap.");
  return rows;
}

// First aligned data point of each calendar month → DCA purchase dates
export function monthlyPurchaseIndexes(rows: PairRow[]): number[] {
  const seen = new Set<string>();
  const idx: number[] = [];
  rows.forEach((r, i) => {
    const key = new Date(r.ts * 1000).toISOString().slice(0, 7);
    if (!seen.has(key)) { seen.add(key); idx.push(i); }
  });
  return idx;
}

// Pure simulation — runs on FULL rows before display thinning
export function buildInvestment(
  rows: PairRow[],
  { mode, amount }: { mode: InvestMode; amount: number }
): { series: SimRow[]; summary: SimSummary } {
  const purchaseIdx = mode === "dca" ? new Set(monthlyPurchaseIndexes(rows)) : new Set([0]);

  let sharesCum = 0, btcCum = 0, investedUSD = 0, purchases = 0;

  const series: SimRow[] = rows.map((r, i) => {
    if (purchaseIdx.has(i)) {
      sharesCum += amount / r.stockUSD;
      btcCum += amount / r.btcUSD;
      investedUSD += amount;
      purchases++;
    }
    const stockValUSD = sharesCum * r.stockUSD;
    const btcValUSD = btcCum * r.btcUSD;
    return {
      ts: r.ts,
      dateLabel: r.dateLabel,
      stockValUSD,
      btcValUSD,
      stockValSats: (stockValUSD / r.btcUSD) * 1e8,
      btcValSats: btcCum * 1e8,
      isPurchase: purchaseIdx.has(i),
    };
  });

  const last = series[series.length - 1];
  const investedSats = btcCum * 1e8; // sats you'd hold if every buy went to BTC — the sats baseline
  const deltaUSD = last.stockValUSD - last.btcValUSD;
  const deltaSats = last.stockValSats - last.btcValSats;

  return {
    series,
    summary: {
      investedUSD,
      investedSats,
      purchases,
      shares: sharesCum,
      btcAcquired: btcCum,
      stockFinalUSD: last.stockValUSD,
      btcFinalUSD: last.btcValUSD,
      stockFinalSats: last.stockValSats,
      btcFinalSats: last.btcValSats,
      stockRetPct: ((last.stockValUSD - investedUSD) / investedUSD) * 100,
      btcRetPct: ((last.btcValUSD - investedUSD) / investedUSD) * 100,
      stockRetSatsPct: ((last.stockValSats - investedSats) / investedSats) * 100,
      deltaUSD,
      deltaSats,
      deltaPct: (deltaUSD / last.btcValUSD) * 100,
      deltaSatsPct: (deltaSats / last.btcValSats) * 100,
      winner: deltaUSD >= 0 ? "stock" : "btc",
    },
  };
}

// Display thinning — always keeps DCA purchase rows and the final row
export function thin<T extends object>(rows: T[], max = 120): T[] {
  if (rows.length <= max) return rows;
  const step = Math.ceil(rows.length / max);
  return rows.filter((r, i) => i % step === 0 || i === rows.length - 1 || ("isPurchase" in r && (r as { isPurchase?: boolean }).isPurchase));
}
