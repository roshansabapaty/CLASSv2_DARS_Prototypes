/**
 * Feature flags for in-flight UX experiments.
 *
 * Keep flags simple constants. Flip them locally to validate, then ship the
 * follow-up PR that removes the flag and deletes the inactive branch.
 */

/**
 * Phase 4 of the UX-Polish "airy density" plan. When `true`, replace the
 * left-edge `WorkflowSidebar` with a horizontal `StageTabBar` rendered
 * directly under `StickyCaseHeader` on case routes.
 *
 * Off by default so the existing sidebar layout remains the prototype's
 * canonical chrome until the new shell is validated end-to-end.
 */
export const FF_STAGE_TAB_BAR = false;
