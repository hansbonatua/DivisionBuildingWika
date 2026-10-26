import {
  ENGINEERING_DATABASE_CATEGORIES,
  ENGINEERING_DATABASE_CATEGORY_LABELS,
  type EngineeringDatabaseCategory,
} from "@/lib/engineering-database/access";

// Pure Summary Report builder for Engineering Databases V1.
// No I/O, no counts, no percentages, no weighted score, no progress and no
// approval state: the matrix only answers "does at least one record exist for
// this (project, category) cell?". Mirrors the program-kerja/summary.ts
// convention where all aggregation is pure and the service owns orchestration.

export type EngineeringDatabaseSummaryProjectInput = {
  id: string;
  name: string;
  location: string;
};

export type EngineeringDatabaseSummaryEntryInput = {
  projectId: string;
  category: EngineeringDatabaseCategory;
};

export type EngineeringDatabaseSummaryRow = {
  no: number;
  projectId: string;
  name: string;
  location: string;
  // True when at least one entry exists for this (project, category) pair.
  has: Record<EngineeringDatabaseCategory, boolean>;
};

export type EngineeringDatabaseSummary = {
  categories: readonly EngineeringDatabaseCategory[];
  rows: EngineeringDatabaseSummaryRow[];
};

function emptyPresence(): Record<EngineeringDatabaseCategory, boolean> {
  return ENGINEERING_DATABASE_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = false;
      return acc;
    },
    {} as Record<EngineeringDatabaseCategory, boolean>,
  );
}

function cellKey(projectId: string, category: string): string {
  return `${projectId}::${category}`;
}

// Driven by ALL Master Projects: a project with zero Engineering Database
// records still appears, with all six cells empty. Entries pointing at an
// unknown project are ignored defensively (the FK makes them impossible).
export function buildEngineeringDatabaseSummary(
  projects: readonly EngineeringDatabaseSummaryProjectInput[],
  entries: readonly EngineeringDatabaseSummaryEntryInput[],
): EngineeringDatabaseSummary {
  const knownCategories = new Set<string>(ENGINEERING_DATABASE_CATEGORIES);
  const present = new Set<string>();

  for (const entry of entries) {
    if (!knownCategories.has(entry.category)) {
      continue;
    }
    present.add(cellKey(entry.projectId, entry.category));
  }

  const rows = projects.map((project, index) => {
    const has = emptyPresence();
    for (const category of ENGINEERING_DATABASE_CATEGORIES) {
      has[category] = present.has(cellKey(project.id, category));
    }
    return {
      no: index + 1,
      projectId: project.id,
      name: project.name,
      location: project.location,
      has,
    };
  });

  return {
    categories: ENGINEERING_DATABASE_CATEGORIES,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Summary Report chart metrics (V1).
//
// Both derivations read the SAME presence summary the matrix consumes, so the
// charts and the matrix can never disagree and no extra request is needed.
// Duplicate records inside one (project, category) cell cannot inflate either
// metric: the summary already collapses them into a single boolean.
// ---------------------------------------------------------------------------

export const ENGINEERING_DATABASE_COMPONENT_COUNT =
  ENGINEERING_DATABASE_CATEGORIES.length;

export type EngineeringDatabaseCategoryCoverage = {
  category: EngineeringDatabaseCategory;
  label: string;
  // Distinct Master Projects with at least one record in this category.
  projectCount: number;
  totalProjects: number;
  // 0..100, unrounded; formatting happens at render time.
  percentage: number;
};

export type EngineeringDatabaseProjectCompleteness = {
  projectId: string;
  name: string;
  location: string;
  availableComponents: number;
  totalComponents: number;
  // 0..100, unrounded; formatting happens at render time.
  percentage: number;
};

// Category order is the locked ENGINEERING_DATABASE_CATEGORIES order.
export function buildCategoryCoverage(
  summary: EngineeringDatabaseSummary,
): EngineeringDatabaseCategoryCoverage[] {
  const totalProjects = summary.rows.length;

  return ENGINEERING_DATABASE_CATEGORIES.map((category) => {
    let projectCount = 0;
    for (const row of summary.rows) {
      if (row.has[category]) {
        projectCount += 1;
      }
    }
    return {
      category,
      label: ENGINEERING_DATABASE_CATEGORY_LABELS[category],
      projectCount,
      totalProjects,
      percentage: totalProjects > 0 ? (projectCount / totalProjects) * 100 : 0,
    };
  });
}

// Project order follows the summary row order (name ASC, location ASC, id ASC)
// so the chart stays consistent with the matrix. Never re-ranked by percentage.
export function buildProjectCompleteness(
  summary: EngineeringDatabaseSummary,
): EngineeringDatabaseProjectCompleteness[] {
  return summary.rows.map((row) => {
    let availableComponents = 0;
    for (const category of ENGINEERING_DATABASE_CATEGORIES) {
      if (row.has[category]) {
        availableComponents += 1;
      }
    }
    return {
      projectId: row.projectId,
      name: row.name,
      location: row.location,
      availableComponents,
      totalComponents: ENGINEERING_DATABASE_COMPONENT_COUNT,
      percentage:
        (availableComponents / ENGINEERING_DATABASE_COMPONENT_COUNT) * 100,
    };
  });
}
