// Non-demo position options for production User Control.
// Values unchanged from the original CMS options.
export const POSITION_OPTIONS = [
  "Staff",
  "Junior Expert",
  "Expert 1",
  "Expert 2",
  "Senior Expert",
  "Site Manager Engineering",
] as const;

export type PositionOption = (typeof POSITION_OPTIONS)[number];
