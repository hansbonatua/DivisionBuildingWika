// Display helpers for the Engineering Database Summary Report. Mirrors
// program-kerja/summaryFormat.ts: formatting lives outside the aggregation and
// chart components so the same value renders identically everywhere.

const countFormatter = new Intl.NumberFormat("id-ID");

// Whole numbers when clean (75 -> "75%"), otherwise at most 2 decimals.
const percentFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

export function formatEngineeringDatabaseCount(value: number): string {
  return Number.isFinite(value) ? countFormatter.format(value) : "—";
}

export function formatEngineeringDatabasePercentage(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${percentFormatter.format(value)}%`;
}
