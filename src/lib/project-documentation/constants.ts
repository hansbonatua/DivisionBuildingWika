// Project Documentation (PDOC) fixed week slots.
//
// Five weeks are application constants, not a database master table. The
// database stores one explicit URL/audit pair per slot, so this array is the
// single source of truth for iteration order in the UI, validation and PDF.
export const PDOC_WEEKS = [1, 2, 3, 4, 5] as const;
