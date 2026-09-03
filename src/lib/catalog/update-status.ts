import { z } from "zod";

export const catalogUpdatePhaseSchema = z.enum([
  "idle",
  "syncing",
  "ingesting",
  "done",
  "error",
]);
export type CatalogUpdatePhase = z.infer<typeof catalogUpdatePhaseSchema>;

export const catalogUpdateStatusSchema = z.object({
  running: z.boolean(),
  phase: catalogUpdatePhaseSchema,
  pruned: z.number().int().nonnegative(),
  discovered: z.number().int().nonnegative(),
  refreshes: z.number().int().nonnegative(),
  processed: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  retried: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  message: z.string().optional(),
  error: z.string().optional(),
});
export type CatalogUpdateStatus = z.infer<typeof catalogUpdateStatusSchema>;

export const idleCatalogUpdateStatus: CatalogUpdateStatus = {
  running: false,
  phase: "idle",
  pruned: 0,
  discovered: 0,
  refreshes: 0,
  processed: 0,
  succeeded: 0,
  skipped: 0,
  failed: 0,
  retried: 0,
  remaining: 0,
  total: 0,
};
