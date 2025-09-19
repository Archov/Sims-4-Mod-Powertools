export const KNOWN_PRESETS = Object.freeze([
  {
    name: 'CAS',
    description: 'Create-a-Sim assets placeholder preset.',
  },
  {
    name: 'BuildBuy',
    description: 'Build/Buy objects placeholder preset.',
  },
  {
    name: 'Worlds',
    description: 'World data placeholder preset.',
  },
]);

export const DEFAULT_ALLOWED_PRESETS = Object.freeze(['CAS', 'BuildBuy'] as const);

// TODO(TaskCard: Inventory & Filtering Author (Phase B)) Refine taxonomy once real presets are defined.