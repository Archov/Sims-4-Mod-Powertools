import type { PlanRequest, PlanResult } from '../types.js';

export function buildPlan(_request: PlanRequest): PlanResult {
  // TODO(TaskCard: Planner (Phase C)) Combine scanner output and manifest data into a dry-run plan.
  void _request;
  throw new Error('buildPlan is not implemented in the skeleton.');
}