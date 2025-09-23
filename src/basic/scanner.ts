// Scanner: expand --files and/or enumerate --in recursively for *.package.
// Determinism: stable sort by path|name|mtime with optional reverse.

import { promises as fs } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { normalizePath, stableCompare, stablePathCompare, stableSortBy } from '../util/determinism.js';

/**
 * Options for scanning inputs
 */
export interface ScanOptions {
  inDirs: string[];
  filesList?: string;
  sortBy: 'name' | 'path' | 'mtime';
  reverse: boolean;
}

/**
 * Information about a discovered package file
 */
export interface PackageInfo {
  path: string;
  normalizedPath: string;
  name: string;
  size: number;
  mtime: Date;
}

/**
 * Result of scanning for package files
 */
export interface ScanResult {
  packages: PackageInfo[];
  totalSize: number;
  totalCount: number;
  skippedFiles: string[];
  errors: string[];
}

/**
 * Main entry point for scanning package files from directories and file lists
 */
export async function scanInputs(options: ScanOptions): Promise<ScanResult> {
  const errors: string[] = [];
  const skippedFiles: string[] = [];
  const allPaths: string[] = [];

  // Process file lists first (they take precedence)
  if (options.filesList) {
    try {
      const listPaths = await expandFilesList(options.filesList, errors);
      allPaths.push(...listPaths);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to process files list '${options.filesList}': ${message}`);
    }
  }

  // Process input directories
  for (const dirPath of options.inDirs) {
    try {
      const dirPaths = await enumerateDirectory(dirPath);
      allPaths.push(...dirPaths);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to enumerate directory '${dirPath}': ${message}`);
    }
  }

  // Deduplicate paths
  const uniquePaths = deduplicatePaths(allPaths);

  // Collect package info for valid files
  const packages: PackageInfo[] = [];
  for (const path of uniquePaths) {
    try {
      const stats = await fs.stat(path);
      if (stats.isFile()) {
        packages.push({
          path,
          normalizedPath: normalizePath(path),
          name: basename(path),
          size: stats.size,
          mtime: stats.mtime,
        });
      } else {
        skippedFiles.push(path);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to stat file '${path}': ${message}`);
      skippedFiles.push(path);
    }
  }

  // Sort packages according to options
  const sortedPackages = sortPackages(packages, options.sortBy, options.reverse);

  // Calculate totals
  const totalSize = sortedPackages.reduce((sum, pkg) => sum + pkg.size, 0);
  const totalCount = sortedPackages.length;

  return {
    packages: sortedPackages,
    totalSize,
    totalCount,
    skippedFiles,
    errors,
  };
}

/**
 * Parse a file list (one path per line, supporting comments)
 * Returns valid paths and throws if the list file itself cannot be read
 */
export async function expandFilesList(filePath: string, errors?: string[]): Promise<string[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const baseDir = dirname(resolve(filePath));
  const paths: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    
    // Skip empty lines and comments
    if (line === '' || line.startsWith('#')) {
      continue;
    }

    // Resolve relative paths against the file list location
    const resolvedPath = resolve(baseDir, line);
    
    // Validate path exists and is readable
    try {
      await fs.access(resolvedPath);
      paths.push(resolvedPath);
    } catch (error) {
      const errorMsg = `Path from file list does not exist or is not readable: ${line}`;
      if (errors) {
        errors.push(errorMsg);
      } else {
        throw new Error(errorMsg);
      }
    }
  }

  return paths;
}

/**
 * Recursively enumerate .package files in a directory
 */
export async function enumerateDirectory(dirPath: string): Promise<string[]> {
  const packages: string[] = [];
  
  async function scanDir(currentPath: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      // Skip directories we can't read
      return;
    }

    for (const entry of entries) {
      const fullPath = resolve(currentPath, entry.name);
      
      // Skip hidden files/directories (starting with .)
      if (entry.name.startsWith('.')) {
        continue;
      }

      // Skip temporary files
      if (entry.name.endsWith('.tmp') || entry.name.endsWith('.temp') || entry.name.includes('~')) {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await scanDir(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.package')) {
        // Add package files
        packages.push(fullPath);
      }
      // Note: symlinks are ignored for safety unless they resolve to directories/files
      // which will be handled by the isDirectory()/isFile() checks above
    }
  }

  await scanDir(resolve(dirPath));
  return packages;
}

/**
 * Remove duplicate paths from an array, preserving order of first occurrence
 */
export function deduplicatePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const path of paths) {
    const normalized = normalizePath(path);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(path);
    }
  }

  return unique;
}

/**
 * Sort packages according to the specified method and order
 */
export function sortPackages(packages: PackageInfo[], sortBy: 'name' | 'path' | 'mtime', reverse: boolean): PackageInfo[] {
  let sorted: PackageInfo[];

  switch (sortBy) {
    case 'name':
      // Sort by name first, then by path for deterministic tie-breaking
      sorted = packages.slice().sort((a, b) => {
        const nameCompare = stableCompare(a.name.toLowerCase(), b.name.toLowerCase());
        if (nameCompare !== 0) {
          return nameCompare;
        }
        return stablePathCompare(a.normalizedPath, b.normalizedPath);
      });
      break;
    
    case 'path':
      sorted = packages.slice().sort((a, b) => stablePathCompare(a.normalizedPath, b.normalizedPath));
      break;
    
    case 'mtime':
      // Sort by mtime (newest first by default), then by path for stability
      sorted = packages.slice().sort((a, b) => {
        const timeDiff = b.mtime.getTime() - a.mtime.getTime(); // newest first
        if (timeDiff !== 0) {
          return timeDiff;
        }
        return stablePathCompare(a.normalizedPath, b.normalizedPath);
      });
      break;
    
    default:
      sorted = packages.slice();
  }

  return reverse ? sorted.reverse() : sorted;
}
