"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { CST_CATEGORIES } from "@/lib/calculation-sheet-template/constants";
import {
  ENGINEERING_DATABASE_CATEGORIES,
  ENGINEERING_DATABASE_CATEGORY_LABELS,
  ENGINEERING_DATABASE_CATEGORY_SLUGS,
  canViewEngineeringDatabase,
} from "@/lib/engineering-database/access";
import { canViewBerkas } from "@/lib/berkas/access";
import { canManageCms } from "@/lib/cms/access";
import { canViewKnowledgeManagement } from "@/lib/knowledge-management/access";
import { canViewMasterProject } from "@/lib/master-project/access";
import { canViewMetodeKerja } from "@/lib/metode-kerja-standar/access";
import { DISIPLIN_LIST } from "@/lib/metode-kerja-standar/constants";
import { canViewOrganizationStructure } from "@/lib/organization-structure/access";
import { canViewMsl } from "@/lib/msl/access";
import { canViewProgramKerja } from "@/lib/program-kerja/access";
import { canViewTemplateForm } from "@/lib/template-form/access";
import { canManageUsers } from "@/lib/users/access";

export type SidebarItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
  userRole?: string;
  // Management-only MSL capability, carried from the server layout through
  // DashboardShell. Never read from the browser; only used for visibility.
  mslAccess?: boolean;
};

function MenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const landingSubMenu: SidebarItem[] = [
  {
    label: "Hero Banner",
    href: "/dashboard/hero",
    icon: (
      <MenuIcon>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </MenuIcon>
    ),
  },
  {
    label: "Our Project",
    href: "/dashboard/projects",
    icon: (
      <MenuIcon>
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </MenuIcon>
    ),
  },
  {
    label: "Green Building Certificate",
    href: "/dashboard/green-building",
    icon: (
      <MenuIcon>
        <circle cx="12" cy="8" r="6" />
        <path d="M15.5 13 17 22l-5-3-5 3 1.5-9" />
      </MenuIcon>
    ),
  },
  {
    label: "Media Sosial",
    href: "/dashboard/social-media",
    icon: (
      <MenuIcon>
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
        <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
      </MenuIcon>
    ),
  },
  {
    label: "Our Client",
    href: "/dashboard/clients",
    icon: (
      <MenuIcon>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </MenuIcon>
    ),
  },
];

const adminMenu: SidebarItem[] = [  {
    label: "User Directory",
    href: "/dashboard/users",
    icon: (
      <MenuIcon>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </MenuIcon>
    ),
  },
];

// Struktur Organisasi is a SINGLE top-level item (never an accordion): there is
// exactly one chart to open. Visibility is uniform across the canonical roles
// through ORGANIZATION_STRUCTURE_VIEW, so no role-specific branching is needed.
const organizationStructureMenu: SidebarItem = {
  label: "Struktur Organisasi",
  href: "/dashboard/struktur-organisasi",
  icon: (
    <MenuIcon>
      <rect width="6" height="6" x="9" y="2" rx="1" />
      <rect width="6" height="6" x="2" y="16" rx="1" />
      <rect width="6" height="6" x="16" y="16" rx="1" />
      <path d="M12 8v4" />
      <path d="M5 16v-2h14v2" />
    </MenuIcon>
  ),
};

export const programKerjaMenu: SidebarItem[] = [
  {
    label: "Summary Report",
    href: "/dashboard/program-kerja/summary",
    icon: (
      <MenuIcon>
        <path d="M9 17v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 1-2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 1 1-1h4a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h4" />
      </MenuIcon>
    ),
  },
  {
    label: "Kelola Program Kerja",
    href: "/dashboard/program-kerja/manage",
    icon: (
      <MenuIcon>
        <rect width="8" height="8" x="3" y="3" rx="1" />
        <rect width="8" height="8" x="13" y="3" rx="1" />
        <rect width="8" height="8" x="3" y="13" rx="1" />
        <rect width="8" height="8" x="13" y="13" rx="1" />
      </MenuIcon>
    ),
  },
];

// Knowledge Management is its own top-level sidebar item (a sibling of Program
// Kerja), with its own accordion state. Its routes keep the separate
// /dashboard/knowledge-management namespace and guard: PROGRAM_KERJA_VIEW stays
// closed to Project, while KNOWLEDGE_MANAGEMENT_VIEW is open to all four roles.
export const knowledgeMenu: SidebarItem[] = [
  {
    label: "Lesson Learn",
    href: "/dashboard/knowledge-management/lesson-learn",
    icon: (
      <MenuIcon>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </MenuIcon>
    ),
  },
  {
    label: "Best Practice / KI KM",
    href: "/dashboard/knowledge-management/best-practice",
    icon: (
      <MenuIcon>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
      </MenuIcon>
    ),
  },
  {
    label: "VA/VE",
    href: "/dashboard/knowledge-management/va-ve",
    icon: (
      <MenuIcon>
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 3 3 5-6" />
      </MenuIcon>
    ),
  },
];

// Berkas is a Core Enterprise module. Visibility follows BERKAS_VIEW; the
// Ajukan form itself additionally requires BERKAS_CREATE, and the Verifikasi
// actions are record-scoped to the assigned validator (enforced by the API).
export const berkasMenu: SidebarItem[] = [
  {
    label: "Ajukan",
    href: "/dashboard/berkas/ajukan",
    icon: (
      <MenuIcon>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="m9 15 3 3 3-3" />
      </MenuIcon>
    ),
  },
  {
    label: "Verifikasi",
    href: "/dashboard/berkas/verifikasi",
    icon: (
      <MenuIcon>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="m9 15 2 2 4-4" />
      </MenuIcon>
    ),
  },
];

const BERKAS_ROOT = "/dashboard/berkas";

export function isBerkasPath(pathname: string): boolean {
  return pathname === BERKAS_ROOT || pathname.startsWith(`${BERKAS_ROOT}/`);
}

// Metode Kerja Standar is its own top-level module with its own accordion.
// Summary is always first (D-D-02), followed by the six disciplines A–F. Labels
// and slugs come from the domain constants, so the submenu cannot drift from the
// values the API and page routes use.
const metodeKerjaDisiplinIcon = (
  <MenuIcon>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </MenuIcon>
);

export const metodeKerjaMenu: SidebarItem[] = [
  {
    label: "Summary",
    href: "/dashboard/metode-kerja-standar/summary",
    icon: (
      <MenuIcon>
        <path d="M3 3v18h18" />
        <path d="M7 15v3" />
        <path d="M12 10v8" />
        <path d="M17 6v12" />
      </MenuIcon>
    ),
  },
  ...DISIPLIN_LIST.map((disiplin) => ({
    label: `${disiplin.code}. ${disiplin.name}`,
    href: `/dashboard/metode-kerja-standar/${disiplin.slug}`,
    icon: metodeKerjaDisiplinIcon,
  })),
];

const METODE_KERJA_ROOT = "/dashboard/metode-kerja-standar";

export function isMetodeKerjaPath(pathname: string): boolean {
  return (
    pathname === METODE_KERJA_ROOT ||
    pathname.startsWith(`${METODE_KERJA_ROOT}/`)
  );
}

const CALCULATION_SHEET_ROOT = "/dashboard/calculation-sheet-template";

export function isCalculationSheetPath(pathname: string): boolean {
  return (
    pathname === CALCULATION_SHEET_ROOT ||
    pathname.startsWith(`${CALCULATION_SHEET_ROOT}/`)
  );
}

const calculationSheetIcon = (
  <MenuIcon>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </MenuIcon>
);

// Multi-page menu: Summary Report first, then one route per canonical category.
// Labels and hrefs come from the canonical constants so the sidebar can never
// drift from the table and API category ids.
export const calculationSheetMenu: SidebarItem[] = [
  {
    label: "Summary Report",
    href: `${CALCULATION_SHEET_ROOT}/summary`,
    icon: (
      <MenuIcon>
        <path d="M3 3v18h18" />
        <path d="M7 15v3" />
        <path d="M12 10v8" />
        <path d="M17 6v12" />
      </MenuIcon>
    ),
  },
  ...CST_CATEGORIES.map((category) => ({
    label: category.label,
    href: `${CALCULATION_SHEET_ROOT}/${category.id}`,
    icon: calculationSheetIcon,
  })),
];

const PROJECT_DOCUMENTATION_ROOT = "/dashboard/project-documentation";

export function isProjectDocumentationPath(pathname: string): boolean {
  return (
    pathname === PROJECT_DOCUMENTATION_ROOT ||
    pathname.startsWith(`${PROJECT_DOCUMENTATION_ROOT}/`)
  );
}

// Project Documentation is a parent accordion with two read/write surfaces:
// the monthly recap and the read-only annual matrix.
export const projectDocumentationMenu: SidebarItem = {
  label: "Project Documentation",
  href: PROJECT_DOCUMENTATION_ROOT,
  icon: (
    <MenuIcon>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </MenuIcon>
  ),
};

export const projectDocumentationSubmenu: SidebarItem[] = [
  {
    label: "Rekap Bulanan",
    href: `${PROJECT_DOCUMENTATION_ROOT}/rekap-bulanan`,
    icon: (
      <MenuIcon>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </MenuIcon>
    ),
  },
  {
    label: "Summary Report",
    href: `${PROJECT_DOCUMENTATION_ROOT}/summary`,
    icon: (
      <MenuIcon>
        <path d="M3 3v18h18" />
        <path d="M7 15v3" />
        <path d="M12 10v8" />
        <path d="M17 6v12" />
      </MenuIcon>
    ),
  },
];

const templateFormMenu: SidebarItem = {
  label: "Template & Form",
  href: "/dashboard/template-form",
  icon: (
    <MenuIcon>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </MenuIcon>
  ),
};

const masterProjectMenu: SidebarItem[] = [
  {
    label: "Kelola Project",
    href: "/dashboard/master-project/manage",
    icon: (
      <MenuIcon>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M8 7h8" />
        <path d="M8 12h8" />
        <path d="M8 17h5" />
      </MenuIcon>
    ),
  },
];

// Category items are derived from the canonical constants so labels/slugs can
// never drift from the API category values.
const engineeringDatabaseCategoryIcon = (
  <MenuIcon>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </MenuIcon>
);

// MSL Engineering lives inside the Engineering Databases group (never as a
// top-level menu). Visibility is decided by canViewMsl — Admin, Head Office and
// Management with the capability; the page/API guards stay authoritative.
const mslMenuItem: SidebarItem = {
  label: "MSL Engineering",
  href: "/dashboard/engineering-database/msl",
  icon: (
    <MenuIcon>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </MenuIcon>
  ),
};

const engineeringDatabaseMenu: SidebarItem[] = [
  {
    label: "Summary Report",
    href: "/dashboard/engineering-database/summary",
    icon: (
      <MenuIcon>
        <path d="M3 3v18h18" />
        <path d="M7 15v3" />
        <path d="M12 10v8" />
        <path d="M17 6v12" />
      </MenuIcon>
    ),
  },
  ...ENGINEERING_DATABASE_CATEGORIES.map((category) => ({
    label: ENGINEERING_DATABASE_CATEGORY_LABELS[category],
    href: `/dashboard/engineering-database/${ENGINEERING_DATABASE_CATEGORY_SLUGS[category]}`,
    icon: engineeringDatabaseCategoryIcon,
  })),
];

const KNOWLEDGE_MANAGEMENT_ROOT = "/dashboard/knowledge-management";

export function isKnowledgeManagementPath(pathname: string): boolean {
  return (
    pathname === KNOWLEDGE_MANAGEMENT_ROOT ||
    pathname.startsWith(`${KNOWLEDGE_MANAGEMENT_ROOT}/`)
  );
}

export type SidebarVisibility = {
  showProgramKerja: boolean;
  showKnowledgeManagement: boolean;
  showBerkas: boolean;
  showMetodeKerja: boolean;
  showCalculationSheet: boolean;
  showProjectDocumentation: boolean;
  showTemplateForm: boolean;
  showMasterProject: boolean;
  showEngineeringDatabase: boolean;
  showMsl: boolean;
  showOrganizationStructure: boolean;
  showCms: boolean;
  showUserDirectory: boolean;
  showCoreEnterprise: boolean;
};

// Pure visibility model for the sidebar. Exported so navigation regressions can
// be tested without a DOM; the component below renders exclusively from it.
export function getSidebarVisibility(
  userRole: string | undefined,
  mslAccess: boolean | undefined,
): SidebarVisibility {
  const role = userRole ?? "";
  const showProgramKerja = canViewProgramKerja(role);
  const showKnowledgeManagement = canViewKnowledgeManagement(role);
  const showBerkas = canViewBerkas(role);
  const showMetodeKerja = canViewMetodeKerja(role);
  // CST has no module access helper; it reads the central permission table.
  const showCalculationSheet = hasPermission(
    role,
    PERMISSIONS.CALCULATION_SHEET_VIEW,
  );
  const showProjectDocumentation = hasPermission(
    role,
    PERMISSIONS.DOCUMENTATION_VIEW,
  );
  const showTemplateForm = canViewTemplateForm(role);
  const showMasterProject = canViewMasterProject(role);
  const showEngineeringDatabase = canViewEngineeringDatabase(role);
  const showMsl = canViewMsl({ role, mslAccess: mslAccess === true });
  const showOrganizationStructure = canViewOrganizationStructure(role);
  // Landing Page Manager and User Directory are Admin-only, resolved through the
  // central permission layer (CMS_MANAGE / USER_MANAGE) rather than a local
  // `role === "Admin"` literal.
  const showCms = canManageCms(role);
  const showUserDirectory = canManageUsers(role);

  return {
    showProgramKerja,
    showKnowledgeManagement,
    showBerkas,
    showMetodeKerja,
    showCalculationSheet,
    showProjectDocumentation,
    showTemplateForm,
    showMasterProject,
    showEngineeringDatabase,
    showMsl,
    showOrganizationStructure,
    showCms,
    showUserDirectory,
    showCoreEnterprise:
      showOrganizationStructure ||
      showProgramKerja ||
      showKnowledgeManagement ||
      showBerkas ||
      showMetodeKerja ||
      showCalculationSheet ||
      showProjectDocumentation ||
      showTemplateForm ||
      showMasterProject ||
      showEngineeringDatabase ||
      showMsl,
  };
}

export type SidebarAccordionState = {
  landingOpen: boolean;
  programKerjaOpen: boolean;
  knowledgeOpen: boolean;
  berkasOpen: boolean;
  metodeKerjaOpen: boolean;
  calculationSheetOpen: boolean;
  projectDocumentationOpen: boolean;
  masterProjectOpen: boolean;
  engineeringDatabaseOpen: boolean;
};

// Initial accordion state: every accordion starts collapsed unless its own
// route is active. Knowledge Management follows the same rule as Metode Kerja
// Standar since 8 November 2026 (Owner decision); the permissive role fallback
// that was introduced by DL-2026-11-04-15 no longer applies to the initial
// state. The panels stay independent of each other.
export function getInitialSidebarAccordionState(
  pathname: string,
): SidebarAccordionState {
  const isLandingRoute = landingSubMenu.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const isProgramKerjaRoute = programKerjaMenu.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return {
    landingOpen: isLandingRoute,
    programKerjaOpen: isProgramKerjaRoute,
    // KM and MKS are both route-driven: an authorized role no longer opens the
    // accordion implicitly. `canViewKnowledgeManagement`/`canViewMetodeKerja`
    // still gate visibility (getSidebarVisibility), not the initial expansion.
    knowledgeOpen: isKnowledgeManagementPath(pathname),
    berkasOpen: isBerkasPath(pathname),
    metodeKerjaOpen: isMetodeKerjaPath(pathname),
    calculationSheetOpen: isCalculationSheetPath(pathname),
    projectDocumentationOpen: isProjectDocumentationPath(pathname),
    masterProjectOpen: pathname.startsWith("/dashboard/master-project"),
    engineeringDatabaseOpen: pathname.startsWith("/dashboard/engineering-database"),
  };
}

export default function DashboardSidebar({
  open,
  onClose,
  userRole,
  mslAccess,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [berkasNotifCount, setBerkasNotifCount] = useState(0);
  const {
    showProgramKerja,
    showKnowledgeManagement,
    showBerkas,
    showMetodeKerja,
    showCalculationSheet,
    showProjectDocumentation,
    showTemplateForm,
    showMasterProject,
    showEngineeringDatabase,
    showMsl,
    showOrganizationStructure,
    showCms,
    showUserDirectory,
    showCoreEnterprise,
  } = getSidebarVisibility(userRole, mslAccess);
  const landingRoutes = landingSubMenu.map((item) => item.href);
  const isLandingRoute = landingRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const programKerjaRoutes = programKerjaMenu.map((item) => item.href);
  const isProgramKerjaRoute = programKerjaRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isKnowledgeManagementRoute = isKnowledgeManagementPath(pathname);
  const isBerkasRoute = isBerkasPath(pathname);
  const isMetodeKerjaRoute = isMetodeKerjaPath(pathname);
  const isCalculationSheetRoute = isCalculationSheetPath(pathname);
  const isProjectDocumentationRoute = isProjectDocumentationPath(pathname);
  const isMasterProjectRoute = pathname.startsWith("/dashboard/master-project");
  const isEngineeringDatabaseRoute = pathname.startsWith(
    "/dashboard/engineering-database",
  );
  const initialAccordions = getInitialSidebarAccordionState(pathname);
  const [landingOpen, setLandingOpen] = useState(initialAccordions.landingOpen);
  const [programKerjaOpen, setProgramKerjaOpen] = useState(
    initialAccordions.programKerjaOpen,
  );
  const [knowledgeOpen, setKnowledgeOpen] = useState(initialAccordions.knowledgeOpen);
  const [berkasOpen, setBerkasOpen] = useState(initialAccordions.berkasOpen);
  const [metodeKerjaOpen, setMetodeKerjaOpen] = useState(
    initialAccordions.metodeKerjaOpen,
  );
  const [calculationSheetOpen, setCalculationSheetOpen] = useState(
    initialAccordions.calculationSheetOpen,
  );
  const [projectDocumentationOpen, setProjectDocumentationOpen] = useState(
    initialAccordions.projectDocumentationOpen,
  );
  const [masterProjectOpen, setMasterProjectOpen] = useState(
    initialAccordions.masterProjectOpen,
  );
  const [engineeringDatabaseOpen, setEngineeringDatabaseOpen] = useState(
    initialAccordions.engineeringDatabaseOpen,
  );
  const [previousPathname, setPreviousPathname] = useState(pathname);

  useEffect(() => {
    if (!showBerkas) return;

    let active = true;
    const controller = new AbortController();

    async function loadNotificationCount(): Promise<void> {
      try {
        const response = await fetch("/api/berkas/notifications", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = (await response.json()) as { needsAction?: unknown };
        if (
          active &&
          typeof body.needsAction === "number" &&
          Number.isInteger(body.needsAction) &&
          body.needsAction >= 0
        ) {
          setBerkasNotifCount(body.needsAction);
        }
      } catch {
        // Notification count is auxiliary; keep the last known value.
      }
    }

    void loadNotificationCount();
    const timer = window.setInterval(() => {
      void loadNotificationCount();
    }, 30_000);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [pathname, showBerkas]);

  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    if (isLandingRoute) {
      setLandingOpen(true);
    }
    if (isProgramKerjaRoute) {
      setProgramKerjaOpen(true);
    }
    if (isKnowledgeManagementRoute) {
      setKnowledgeOpen(true);
    }
    if (isBerkasRoute) {
      setBerkasOpen(true);
    }
    if (isMetodeKerjaRoute) {
      setMetodeKerjaOpen(true);
    }
    if (isCalculationSheetRoute) {
      setCalculationSheetOpen(true);
    }
    if (isProjectDocumentationRoute) {
      setProjectDocumentationOpen(true);
    }
    if (isMasterProjectRoute) {
      setMasterProjectOpen(true);
    }
    if (isEngineeringDatabaseRoute) {
      setEngineeringDatabaseOpen(true);
    }
  }

  function isActivePath(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  async function handleLogout(): Promise<void> {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Logout endpoint is idempotent; navigation below still clears the
      // session client-side only if the server cleared the cookie. On network
      // failure the dashboard guard will redirect back to /login anyway.
    } finally {
      setLoggingOut(false);
    }
    onClose();
    router.replace("/login");
    router.refresh();
  }

  function renderItem(item: SidebarItem, badgeCount = 0) {
    const isActive = isActivePath(item.href);
    const badge =
      badgeCount > 0 ? (
        <span
          className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-4 text-white"
          aria-label={`${badgeCount} Berkas membutuhkan tindakan`}
        >
          {badgeCount}
        </span>
      ) : null;

    if (isActive) {
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={onClose}
          aria-current="page"
          className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-secondary transition-colors"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-secondary">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {badge}
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
          </span>
        </Link>
      );
    }
    return (
      <Link
        key={item.label}
        href={item.href}
        onClick={onClose}
        className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-slate-400">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </span>
        {badge}
      </Link>
    );
  }

  return (
    <aside
      id="dashboardSidebar"
      className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 select-none flex-col border-r border-slate-200 bg-white transition-transform duration-300 ${
        open ? "translate-x-0 shadow-[8px_0_24px_rgba(0,0,0,0.12)]" : "-translate-x-full"
      } md:sticky md:top-20 md:z-40 md:h-[calc(100svh-5rem)] md:translate-x-0 md:shadow-none`}
    >
      <div className="flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Landing Page Manager group — Admin only. Hidden in full (heading
              included) for other roles so no empty group is left behind. */}
          {showCms ? (
          <div>
            <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              DASHBOARD ADMIN
            </div>
            <div className="px-1">
              <button
                type="button"
                aria-expanded={landingOpen}
                aria-controls="landing-page-manager-menu"
                onClick={() => setLandingOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-secondary">
                    <MenuIcon>
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M3 9h18" />
                      <path d="M9 21V9" />
                    </MenuIcon>
                  </span>
                  <span>Landing Page Manager</span>
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={`text-slate-400 transition-transform duration-200 ${landingOpen ? "rotate-180" : "rotate-0"}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
          ) : null}

          {showCms && landingOpen ? (
            <div id="landing-page-manager-menu">
              <nav className="ml-4 space-y-1 border-l-2 border-slate-100 pl-3" aria-label="Landing Page Manager">
                {landingSubMenu.map(renderItem)}
              </nav>
            </div>
          ) : null}

          {showCoreEnterprise ? (
            <div>
              <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Core Enterprise
              </div>
              {/* Single top-level item, placed before the module groups: the
                  company chart is reference material, not a module to manage. */}
              {showOrganizationStructure ? (
                <div className="mb-1">
                  <nav className="space-y-1 px-1" aria-label="Struktur Organisasi">
                    {renderItem(organizationStructureMenu)}
                  </nav>
                </div>
              ) : null}
              {showProgramKerja ? (
                <div>
                  <div className="px-1">
                    <button
                      type="button"
                      aria-expanded={programKerjaOpen}
                      aria-controls="program-kerja-menu"
                      onClick={() => setProgramKerjaOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-secondary">
                          <MenuIcon>
                            <path d="M3 3v18h18" />
                            <path d="M7 15v3" />
                            <path d="M12 10v8" />
                            <path d="M17 6v12" />
                          </MenuIcon>
                        </span>
                        <span>Program Kerja</span>
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`text-slate-400 transition-transform duration-200 ${programKerjaOpen ? "rotate-180" : "rotate-0"}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  {programKerjaOpen ? (
                    <div id="program-kerja-menu" className="space-y-1">
                      {showProgramKerja ? (
                        <nav className="ml-4 space-y-1 border-l-2 border-slate-100 pl-3" aria-label="Program Kerja">
                          {programKerjaMenu.map(renderItem)}
                        </nav>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showKnowledgeManagement ? (
                <div className="mt-1">
                  <div className="px-1">
                    <button
                      type="button"
                      aria-expanded={knowledgeOpen}
                      aria-controls="knowledge-management-menu"
                      onClick={() => setKnowledgeOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                        <span className="text-secondary">
                          <MenuIcon>
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </MenuIcon>
                        </span>
                        <span>Knowledge Management</span>
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`text-slate-400 transition-transform duration-200 ${knowledgeOpen ? "rotate-180" : "rotate-0"}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  {knowledgeOpen ? (
                    <div id="knowledge-management-menu">
                      <nav
                        className="ml-4 space-y-1 border-l-2 border-slate-100 pl-3"
                        aria-label="Knowledge Management"
                      >
                        {knowledgeMenu.map(renderItem)}
                      </nav>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showMetodeKerja ? (
                <div className="mt-1">
                  <div className="px-1">
                    <button
                      type="button"
                      aria-expanded={metodeKerjaOpen}
                      aria-controls="metode-kerja-standar-menu"
                      onClick={() => setMetodeKerjaOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-secondary">
                          <MenuIcon>
                            <path d="M9 11l3 3L22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                          </MenuIcon>
                        </span>
                        <span>Metode Kerja Standar</span>
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`text-slate-400 transition-transform duration-200 ${metodeKerjaOpen ? "rotate-180" : "rotate-0"}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  {metodeKerjaOpen ? (
                    <div id="metode-kerja-standar-menu">
                      <nav
                        className="ml-4 space-y-1 border-l-2 border-slate-100 pl-3"
                        aria-label="Metode Kerja Standar"
                      >
                        {metodeKerjaMenu.map(renderItem)}
                      </nav>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showCalculationSheet ? (
                <div className="mt-1">
                  <div className="px-1">
                    <button
                      type="button"
                      aria-expanded={calculationSheetOpen}
                      aria-controls="calculation-sheet-template-menu"
                      onClick={() => setCalculationSheetOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                        <span className="text-secondary">{calculationSheetIcon}</span>
                        <span>Calculation Sheet Template</span>
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`text-slate-400 transition-transform duration-200 ${calculationSheetOpen ? "rotate-180" : "rotate-0"}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  {calculationSheetOpen ? (
                    <div id="calculation-sheet-template-menu">
                      <nav
                        className="ml-4 space-y-1 border-l-2 border-slate-100 pl-3"
                        aria-label="Calculation Sheet Template"
                      >
                        {calculationSheetMenu.map(renderItem)}
                      </nav>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showProjectDocumentation ? (
                <div className="mt-1">
                  <div className="px-1">
                    <button
                      type="button"
                      aria-expanded={projectDocumentationOpen}
                      aria-controls="project-documentation-menu"
                      onClick={() =>
                        setProjectDocumentationOpen((prev) => !prev)
                      }
                      className="flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-secondary">
                          {projectDocumentationMenu.icon}
                        </span>
                        <span>Project Documentation</span>
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`text-slate-400 transition-transform duration-200 ${projectDocumentationOpen ? "rotate-180" : "rotate-0"}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  {projectDocumentationOpen ? (
                    <div id="project-documentation-menu">
                      <nav
                        className="ml-4 space-y-1 border-l-2 border-slate-100 pl-3"
                        aria-label="Project Documentation"
                      >
                        {projectDocumentationSubmenu.map(renderItem)}
                      </nav>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showBerkas ? (
                <div className="mt-1">
                  <div className="px-1">
                    <button
                      type="button"
                      aria-expanded={berkasOpen}
                      aria-controls="berkas-menu"
                      onClick={() => setBerkasOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-secondary">
                          <MenuIcon>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                            <path d="M8 13h8" />
                            <path d="M8 17h5" />
                          </MenuIcon>
                        </span>
                        <span>Berkas</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {berkasNotifCount > 0 ? (
                          <span
                            className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-4 text-white"
                            aria-label={`${berkasNotifCount} Berkas membutuhkan tindakan`}
                          >
                            {berkasNotifCount}
                          </span>
                        ) : null}
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className={`text-slate-400 transition-transform duration-200 ${berkasOpen ? "rotate-180" : "rotate-0"}`}
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </button>
                  </div>
                  {berkasOpen ? (
                    <div id="berkas-menu">
                      <nav
                        className="ml-4 space-y-1 border-l-2 border-slate-100 pl-3"
                        aria-label="Berkas"
                      >
                        {berkasMenu.map((item) =>
                          renderItem(item, berkasNotifCount),
                        )}
                      </nav>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showTemplateForm ? (
                <div className="mt-1">
                  <nav className="space-y-1 px-1" aria-label="Template & Form">
                    {renderItem(templateFormMenu)}
                  </nav>
                </div>
              ) : null}
              {showMasterProject ? (
                <div className="mt-1">
                  <div className="px-1">
                    <button
                      type="button"
                      aria-expanded={masterProjectOpen}
                      aria-controls="master-project-menu"
                      onClick={() => setMasterProjectOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-secondary">
                          <MenuIcon>
                            <path d="M3 21h18" />
                            <path d="M5 21V7l8-4v18" />
                            <path d="M19 21V11l-6-4" />
                            <path d="M9 9v.01" />
                            <path d="M9 12v.01" />
                            <path d="M9 15v.01" />
                            <path d="M9 18v.01" />
                          </MenuIcon>
                        </span>
                        <span>Master Project</span>
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`text-slate-400 transition-transform duration-200 ${masterProjectOpen ? "rotate-180" : "rotate-0"}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  {masterProjectOpen ? (
                    <div id="master-project-menu">
                      <nav
                        className="ml-4 space-y-1 border-l-2 border-slate-100 pl-3"
                        aria-label="Master Project"
                      >
                        {masterProjectMenu.map(renderItem)}
                      </nav>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {showEngineeringDatabase || showMsl ? (
                <div className="mt-1">
                  <div className="px-1">
                    <button
                      type="button"
                      aria-expanded={engineeringDatabaseOpen}
                      aria-controls="engineering-database-menu"
                      onClick={() => setEngineeringDatabaseOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-lg border border-transparent px-2.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-secondary">
                          <MenuIcon>
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                          </MenuIcon>
                        </span>
                        <span>Engineering Databases</span>
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`text-slate-400 transition-transform duration-200 ${engineeringDatabaseOpen ? "rotate-180" : "rotate-0"}`}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                  {engineeringDatabaseOpen ? (
                    <div id="engineering-database-menu">
                      <nav
                        className="ml-4 space-y-1 border-l-2 border-slate-100 pl-3"
                        aria-label="Engineering Databases"
                      >
                        {(showMsl ? [mslMenuItem] : [])
                          .concat(showEngineeringDatabase ? engineeringDatabaseMenu : [])
                          .map(renderItem)}
                      </nav>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* User Directory — Admin only (USER_MANAGE). */}
          {showUserDirectory ? (
          <div className="border-t border-slate-200 pt-2">
            <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              ADMINISTRASI
            </div>
            <nav className="space-y-1 px-1">
              {adminMenu.map((item) => {
                const isActive = isActivePath(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      isActive
                        ? "flex items-center justify-between rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-bold text-secondary transition-colors"
                        : "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    }
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={isActive ? "text-secondary" : "text-slate-400"}>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-secondary" /> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={loggingOut}
        className="flex w-full shrink-0 items-center justify-center gap-2 border-t border-slate-200 px-5 py-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" x2="9" y1="12" y2="12" />
        </svg>
        <span>{loggingOut ? "Keluar..." : "Logout"}</span>
      </button>
    </aside>
  );
}
