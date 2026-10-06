export type ClientItem = {
  id: string;
  name: string;
  shortName: string;
  category: string;
  link: string;
  visible: boolean;
  updated: string | null;
};

export const initialClients: ClientItem[] = [
  {
    id: "CLI-WIKA-GOV-01",
    name: "Kementerian Pekerjaan Umum dan Perumahan Rakyat (PUPR)",
    shortName: "Kementerian PUPR",
    category: "Kementerian RI • Prioritas Top",
    link: "https://pu.go.id",
    visible: true,
    updated: "Diperbarui 2 jam lalu",
  },
  {
    id: "CLI-WIKA-02",
    name: "PT PLN (Persero)",
    shortName: "PT PLN (Persero)",
    category: "BUMN Energi & Infrastruktur",
    link: "",
    visible: true,
    updated: null,
  },
  {
    id: "CLI-WIKA-03",
    name: "Otorita Ibu Kota Nusantara (OIKN)",
    shortName: "Otorita Ibu Kota Nusantara (OIKN)",
    category: "Badan Otorita Khusus",
    link: "",
    visible: true,
    updated: null,
  },
  {
    id: "CLI-WIKA-04",
    name: "PT Telkom Indonesia Tbk",
    shortName: "PT Telkom Indonesia Tbk",
    category: "BUMN Telekomunikasi",
    link: "",
    visible: true,
    updated: null,
  },
  {
    id: "CLI-WIKA-05",
    name: "PT Pertamina (Persero)",
    shortName: "PT Pertamina (Persero)",
    category: "BUMN Migas & Energi Baru",
    link: "",
    visible: true,
    updated: null,
  },
  {
    id: "CLI-WIKA-06",
    name: "Bank Mandiri (Persero) Tbk",
    shortName: "Bank Mandiri (Persero) Tbk",
    category: "Perbankan BUMN • Disembunyikan",
    link: "",
    visible: false,
    updated: null,
  },
];

export function getClientById(id: string): ClientItem | undefined {
  return initialClients.find((client) => client.id === id);
}
