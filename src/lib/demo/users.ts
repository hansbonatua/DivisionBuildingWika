export type CmsUser = {
  id: number;
  photo: string;
  name: string;
  phone: string;
  nip: string;
  position: string;
  role: string;
  password: string;
};

export const POSITION_OPTIONS = [
  "Staff",
  "Junior Expert",
  "Expert 1",
  "Expert 2",
  "Senior Expert",
  "Site Manager Engineering",
];

export const ROLE_OPTIONS = ["Admin", "Head Office", "Project", "Management"];

export const initialUsers: CmsUser[] = [
  {
    id: 1,
    photo: "",
    name: "R. Triyanto",
    phone: "081234567890",
    nip: "198501012010011001",
    position: "Senior Expert",
    role: "Project",
    password: "******",
  },
  {
    id: 2,
    photo: "",
    name: "Sinta Maharani",
    phone: "081298765432",
    nip: "199003152015022002",
    position: "Expert 1",
    role: "Head Office",
    password: "******",
  },
  {
    id: 3,
    photo: "",
    name: "Budi Santoso",
    phone: "081377788899",
    nip: "199207202018031003",
    position: "Site Manager Engineering",
    role: "Admin",
    password: "******",
  },
];

export function getUserById(id: number): CmsUser | undefined {
  return initialUsers.find((user) => user.id === id);
}

export function userInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
