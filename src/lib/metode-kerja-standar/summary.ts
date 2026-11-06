import {
  DISIPLIN_LIST,
  getDisiplinByCode,
  type DisiplinCode,
} from "@/lib/metode-kerja-standar/constants";

// Pure Summary builder/filter for MKS. No I/O: the service loads all rows once
// and the page filters this array client-side (D-MKS-02).

export type SummaryPic = {
  user_id: string;
  name: string;
  status: string;
  position: string;
};

export type SummaryItemInput = {
  id: string;
  kode: string;
  nama: string;
  evidenceUrl: string | null;
  updatedAt: string;
  pics: SummaryPic[];
};

export type SummarySubKategoriInput = {
  id: string;
  disiplin: DisiplinCode;
  kode: string;
  nama: string;
  evidenceUrl: string | null;
  updatedAt: string;
  pics: SummaryPic[];
  items: SummaryItemInput[];
};

export type SummaryRowStatus =
  | "item"
  | "sub-kategori-kosong"
  | "disiplin-kosong";

export type SummaryRow = {
  disiplin: { code: DisiplinCode; slug: string; name: string };
  sub_kategori: { id: string; kode: string; nama: string } | null;
  item: { id: string; kode: string; nama: string } | null;
  pics: SummaryPic[];
  evidence_url: string | null;
  status: SummaryRowStatus;
  updated_at: string | null;
};

export type SummaryFilter = {
  disiplin?: string | null;
  picUserId?: string | null;
  search?: string;
};

function disiplinRef(code: DisiplinCode): SummaryRow["disiplin"] {
  const found = getDisiplinByCode(code);
  if (!found) {
    throw new Error(`Unknown disiplin code: ${code}`);
  }
  return { code: found.code, slug: found.slug, name: found.name };
}

function dedupePics(pics: readonly SummaryPic[]): SummaryPic[] {
  const seen = new Set<string>();
  const result: SummaryPic[] = [];
  for (const pic of pics) {
    if (seen.has(pic.user_id)) continue;
    seen.add(pic.user_id);
    result.push(pic);
  }
  return result;
}

export function buildMetodeKerjaSummary(
  subKategori: readonly SummarySubKategoriInput[],
): SummaryRow[] {
  const rows: SummaryRow[] = [];

  for (const disiplin of DISIPLIN_LIST) {
    const subRows = subKategori.filter((row) => row.disiplin === disiplin.code);
    const disiplinInfo = disiplinRef(disiplin.code);

    if (subRows.length === 0) {
      rows.push({
        disiplin: disiplinInfo,
        sub_kategori: null,
        item: null,
        pics: [],
        evidence_url: null,
        status: "disiplin-kosong",
        updated_at: null,
      });
      continue;
    }

    for (const sub of subRows) {
      if (sub.items.length === 0) {
        rows.push({
          disiplin: disiplinInfo,
          sub_kategori: { id: sub.id, kode: sub.kode, nama: sub.nama },
          item: null,
          pics: dedupePics(sub.pics),
          evidence_url: sub.evidenceUrl,
          status: "sub-kategori-kosong",
          updated_at: sub.updatedAt,
        });
        continue;
      }

      for (const item of sub.items) {
        rows.push({
          disiplin: disiplinInfo,
          sub_kategori: { id: sub.id, kode: sub.kode, nama: sub.nama },
          item: { id: item.id, kode: item.kode, nama: item.nama },
          pics: dedupePics([...sub.pics, ...item.pics]),
          evidence_url: item.evidenceUrl,
          status: "item",
          updated_at: item.updatedAt,
        });
      }
    }
  }

  return rows;
}

export function filterSummaryRows(
  rows: readonly SummaryRow[],
  filter: SummaryFilter,
): SummaryRow[] {
  const disiplinFilter = filter.disiplin?.trim() ?? "";
  const picFilter = filter.picUserId?.trim() ?? "";
  const search = filter.search?.trim().toLowerCase() ?? "";

  return rows.filter((row) => {
    if (
      disiplinFilter &&
      row.disiplin.code !== disiplinFilter &&
      row.disiplin.slug !== disiplinFilter
    ) {
      return false;
    }
    if (picFilter && !row.pics.some((pic) => pic.user_id === picFilter)) {
      return false;
    }
    if (!search) {
      return true;
    }

    const haystack = [
      row.disiplin.code,
      row.disiplin.slug,
      row.disiplin.name,
      row.sub_kategori?.kode ?? "",
      row.sub_kategori?.nama ?? "",
      row.item?.kode ?? "",
      row.item?.nama ?? "",
      ...row.pics.map((pic) => pic.name),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(search);
  });
}
