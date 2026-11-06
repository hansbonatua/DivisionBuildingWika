import MetodeKerjaSummaryPage from "@/components/dashboard/metode-kerja-standar/MetodeKerjaSummaryPage";

// Summary Report is the MKS landing page. The layout already enforces auth and
// METODE_KERJA_VIEW; Summary itself is read-only for every viewer.
export default function MetodeKerjaSummaryRoutePage() {
  return <MetodeKerjaSummaryPage />;
}
