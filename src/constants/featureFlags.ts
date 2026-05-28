/**
 * Feature flags for in-flight UX experiments.
 *
 * Keep flags simple constants. Flip them locally to validate, then ship the
 * follow-up PR that removes the flag and deletes the inactive branch.
 */

/**
 * Teams-style list-pane nav for the case workflow. When `true`, replace
 * the legacy `WorkflowSidebar` with `WorkflowListPane` (Path A of
 * `dars-workflow-nav-listpane-rfc.md`). The new pane:
 *   - 280 px wide (vs the legacy 256 px).
 *   - Scope header with case-id + priority + assignee + action icons.
 *   - 3 stage groups; active stage shows its sub-steps.
 *   - Sticky footer hosting Save Draft + Submit Case.
 *
 * Per §11 RFC decision, the default is **ON** for the Cases app only
 * (Attorney Dashboard / Notifications are unaffected because the workflow
 * pane only mounts on Cases anyway).
 */
export const FF_NAV_V2_LIST_PANE = true;
