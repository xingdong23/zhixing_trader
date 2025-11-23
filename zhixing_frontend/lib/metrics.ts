export interface EquityPoint {
  date: string; // ISO
  equity: number;
}

export function groupDate(dateIso: string, granularity: "day" | "week" | "month"): string {
  const d = new Date(dateIso);
  if (granularity === "day") return d.toISOString().slice(0, 10);
  if (granularity === "week") {
    const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() - day + 1);
    return tmp.toISOString().slice(0, 10);
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function computeEquityCurve(
  trades: Array<{ createdAt: string; netPnl?: number; realizedPnl?: number }>,
  initialEquity = 100000,
  granularity: "day" | "week" | "month" = "day"
): EquityPoint[] {
  if (!Array.isArray(trades) || trades.length === 0) return [];
  const buckets = new Map<string, number>();
  trades.forEach((t) => {
    const key = groupDate(t.createdAt, granularity);
    const v = (t.netPnl ?? t.realizedPnl ?? 0) as number;
    buckets.set(key, (buckets.get(key) || 0) + (Number.isFinite(v) ? v : 0));
  });
  const keys = Array.from(buckets.keys()).sort();
  let equity = initialEquity;
  const points: EquityPoint[] = [];
  keys.forEach((k) => {
    equity += buckets.get(k)!;
    points.push({ date: k, equity: equity });
  });
  return points;
}

export function computeDailyReturns(points: EquityPoint[]): number[] {
  const ret: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].equity;
    const curr = points[i].equity;
    if (prev > 0) ret.push((curr - prev) / prev);
  }
  return ret;
}

export function computeMaxDrawdown(points: EquityPoint[]): number {
  let peak = -Infinity;
  let maxDD = 0;
  points.forEach((p) => {
    peak = Math.max(peak, p.equity);
    const dd = peak > 0 ? (p.equity - peak) / peak : 0;
    if (dd < maxDD) maxDD = dd;
  });
  return Math.abs(maxDD) * 100; // percent
}

export function computeSharpe(returns: number[], periodsPerYear = 252): number {
  if (returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (mean / std) * Math.sqrt(periodsPerYear);
}


