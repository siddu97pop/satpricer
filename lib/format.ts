export const fmtUSD = (v: number) =>
  "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtUSDCompact = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  if (a >= 1e4) return "$" + (v / 1e3).toFixed(1) + "k";
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

// Sats formatter — flips to BTC above 0.1 BTC so huge counts stay readable
export const fmtSats = (v: number) => {
  const a = Math.abs(v);
  if (a >= 1e7) return (v / 1e8).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + " BTC";
  if (a >= 1e6) return (v / 1e6).toFixed(2) + "M sats";
  return Math.round(v).toLocaleString() + " sats";
};

export const fmtBtcRatio = (v: number) => v.toFixed(5) + " BTC";

export const pct = (v: number) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";

export const retColor = (v: number) => (v >= 0 ? "text-greenc" : "text-redc");
