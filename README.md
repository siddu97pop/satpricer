# SatPricer

**What if you'd bought Bitcoin instead?**

Compare investing in any stock vs BTC over 1M–Max timeframes — lump sum or monthly DCA — priced in dollars or sats. In sats mode, the BTC position is the flat 0% benchmark: a world where Bitcoin is the unit of account.

Live: https://satpricer.lexitools.tech

## Stack

- Next.js 14 (App Router) · TypeScript · Tailwind CSS · Chart.js 4
- Data: VPS-hosted FastAPI wrapper around `yfinance` (`satpricer-api.lexitools.tech`)

## Develop

```bash
npm install
npm run dev
```

Optional env (see `.env.example`): `NEXT_PUBLIC_API_BASE` — defaults to the production API.

## Notes

- DCA buys land on the first available data point of each calendar month.
- Split-adjusted closes; dividends excluded.
- Prototype history (v1–v5 single-file versions) lives in the parent vault folder, tracked in `../VERSIONS.md`.
