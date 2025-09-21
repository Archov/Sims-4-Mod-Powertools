// src/basic/types.ts
export interface BasicCliOptions {
  in: string[];
  files?: string;
  out?: string;
  byFolder: boolean;
  outRoot?: string;
  sort: 'name' | 'path' | 'mtime';
  reverse: boolean;
  maxSize?: number;
  manifestOut?: string;
  changelog: boolean;
  statsJson?: string;
  verify: boolean;
  dryRun: boolean;
  progress: boolean;
}
