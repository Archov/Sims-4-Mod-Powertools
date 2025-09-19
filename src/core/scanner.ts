import type { ScanRequest, ScanResult } from '../types.js';

export async function scanPackages(_request: ScanRequest): Promise<ScanResult> {
  // TODO(TaskCard: Scanner (Phase B2)) Implement deterministic discovery of .package files.
  void _request;
  throw new Error('scanPackages is not implemented in the skeleton.');
}