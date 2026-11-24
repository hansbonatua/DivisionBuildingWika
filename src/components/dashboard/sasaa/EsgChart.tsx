import MonthlyBarChart from "./MonthlyBarChart";
import type { SasaaEsgStatus } from "./types";

// ESG chart. The Complete/Half/null cell state is mapped to the shared 0..5
// axis here (Complete 5, Half 3, empty 0) so the chart component stays a dumb
// renderer; `colorByStatus` keeps the real state in the bar colour and legend.

export const ESG_COMPLETE_VALUE = 5;
export const ESG_HALF_VALUE = 3;
export const ESG_EMPTY_VALUE = 0;

export default function EsgChart({
  esg,
  year,
}: {
  esg: Array<SasaaEsgStatus | null>;
  year: number;
}) {
  const complete = esg.filter((status) => status === "Complete").length;
  const half = esg.filter((status) => status === "Half").length;

  const data = esg.map((status, index) => ({
    month: index + 1,
    value:
      status === "Complete"
        ? ESG_COMPLETE_VALUE
        : status === "Half"
          ? ESG_HALF_VALUE
          : ESG_EMPTY_VALUE,
    status,
  }));

  return (
    <MonthlyBarChart
      data={data}
      title={`Penilaian ESG ${year}`}
      subtitle={`Complete: ${complete} · Half: ${half}`}
      colorByStatus
      height={200}
    />
  );
}
