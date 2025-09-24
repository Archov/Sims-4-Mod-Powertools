// S4TK Adapter: Clean interface for S4TK package operations
import { Package as S4TKPackage } from '@s4tk/models';
import { promises as fs } from 'node:fs';

/**
 * Opaque wrapper around S4TK Package instance
 */
export interface S4Package {
  readonly _internal: S4TKPackage;
  resourceCount: number;
  estimatedSize: number;
}

/**
 * Information about resource types in a package
 */
export interface ResourceTypeInfo {
  typeId: string;
  count: number;
}

/**
 * Statistics about a package
 */
export interface PackageStats {
  resourceCount: number;
  uniqueTypes: ResourceTypeInfo[];
  estimatedSize: number;
}

/**
 * Error types for S4TK operations
 */
export class S4TKError extends Error {
  constructor(message: string, public readonly filePath?: string, cause?: Error) {
    super(filePath ? `${message} (${filePath})` : message);
    this.cause = cause;
    this.name = 'S4TKError';
  }
}

export class PackageLoadError extends S4TKError {
  constructor(filePath: string, cause: Error) {
    super('Failed to load package file', filePath, cause);
    this.name = 'PackageLoadError';
  }
}

export class PackageCorruptionError extends S4TKError {
  constructor(filePath: string, cause: Error) {
    super('Package file appears to be corrupted', filePath, cause);
    this.name = 'PackageCorruptionError';
  }
}

/**
 * Create a new empty package
 */
export function createEmptyPackage(): S4Package {
  try {
    const pkg = new S4TKPackage();
    return {
      _internal: pkg,
      resourceCount: 0,
      estimatedSize: 0,
    };
  } catch (error) {
    throw new S4TKError('Failed to create empty package', undefined, error as Error);
  }
}

/**
 * Load an existing package from file
 */
export async function loadPackage(filePath: string): Promise<S4Package> {
  try {
    // Read file as buffer first, then pass to S4TK
    const fileBuffer = await fs.readFile(filePath);
    const pkg = S4TKPackage.from(fileBuffer);
    
    const stats = calculatePackageStats(pkg);
    
    return {
      _internal: pkg,
      resourceCount: stats.resourceCount,
      estimatedSize: stats.estimatedSize,
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    
    // Handle specific error types
    if (err.message.includes('Not a package file')) {
      throw new PackageCorruptionError(filePath, err);
    } else if (err.code === 'ENOENT') {
      throw new PackageLoadError(filePath, new Error('File not found'));
    } else {
      throw new PackageLoadError(filePath, err);
    }
  }
}

/**
 * Append all resources from source package to target package
 */
export function appendAllResources(target: S4Package, source: S4Package): void {
  try {
    // Clone the source package to avoid modifying the original
    const sourceClone = source._internal.clone();
    
    // Get all entries from source and add to target using the public API
    const entries = sourceClone.entries || [];
    
    for (const entry of entries) {
      try {
        // Use the public API to add each resource to the target package
        target._internal.add(entry.key, entry.value);
      } catch (resourceError) {
        // Continue with other resources if one fails
        // TODO: Consider collecting these errors instead of silently continuing
        // For now, we'll skip failed resources to allow partial success
        continue;
      }
    }
    
    // Update target stats
    const newStats = calculatePackageStats(target._internal);
    target.resourceCount = newStats.resourceCount;
    target.estimatedSize = newStats.estimatedSize;
    
  } catch (error) {
    throw new S4TKError('Failed to append resources', undefined, error as Error);
  }
}

/**
 * Get total resource count in package
 */
export function getResourceCount(pkg: S4Package): number {
  return pkg.resourceCount;
}

/**
 * Get unique resource type IDs in package
 */
export function getResourceTypes(pkg: S4Package): Set<string> {
  try {
    const types = new Set<string>();
    
    // Iterate through package entries to collect type IDs
    const entries = pkg._internal.entries || [];
    
    for (const entry of entries) {
      // Access type from entry.key.type
      if (entry.key && entry.key.type !== undefined) {
        const typeValue = entry.key.type;
        if (typeof typeValue === 'number') {
          // Convert number to hex string
          types.add(`0x${typeValue.toString(16).padStart(8, '0')}`);
        } else if (typeof typeValue === 'string') {
          types.add(typeValue);
        } else if (typeValue && typeof typeValue === 'object' && 'toString' in typeValue) {
          types.add(typeValue.toString());
        }
      }
    }
    
    return types;
  } catch (error) {
    throw new S4TKError('Failed to get resource types', undefined, error as Error);
  }
}

/**
 * Serialize package to buffer
 */
export function serializePackage(pkg: S4Package): Buffer {
  try {
    return pkg._internal._serialize();
  } catch (error) {
    throw new S4TKError('Failed to serialize package', undefined, error as Error);
  }
}

/**
 * Write package to file
 */
export async function writePackage(pkg: S4Package, filePath: string): Promise<void> {
  try {
    const buffer = serializePackage(pkg);
    await fs.writeFile(filePath, buffer);
  } catch (error) {
    throw new S4TKError('Failed to write package file', filePath, error as Error);
  }
}

/**
 * Estimate serialized size of package
 */
export function estimateSerializedSize(pkg: S4Package): number {
  return pkg.estimatedSize;
}

/**
 * Calculate package statistics
 */
function calculatePackageStats(pkg: S4TKPackage): PackageStats {
  try {
    const entries = pkg.entries || [];
    const resourceCount = entries.length;
    
    // Calculate unique types
    const typeMap = new Map<string, number>();
    for (const entry of entries) {
      // Access type from entry.key.type
      if (entry.key && entry.key.type !== undefined) {
        const typeValue = entry.key.type;
        let typeId: string;
        
        if (typeof typeValue === 'number') {
          // Convert number to hex string
          typeId = `0x${typeValue.toString(16).padStart(8, '0')}`;
        } else if (typeof typeValue === 'string') {
          typeId = typeValue;
        } else if (typeValue && typeof typeValue === 'object' && 'toString' in typeValue) {
          typeId = typeValue.toString();
        } else {
          continue;
        }
        
        typeMap.set(typeId, (typeMap.get(typeId) || 0) + 1);
      }
    }
    
    const uniqueTypes: ResourceTypeInfo[] = Array.from(typeMap.entries()).map(
      ([typeId, count]) => ({ typeId, count })
    );
    
    // Calculate estimated size (S4TK entry.value is complex, so use reasonable estimate)
    const estimatedSize = entries.length * 1024; // Reasonable estimate per resource
    
    return {
      resourceCount,
      uniqueTypes,
      estimatedSize,
    };
  } catch (error) {
    // Return minimal stats if calculation fails
    return {
      resourceCount: 0,
      uniqueTypes: [],
      estimatedSize: 0,
    };
  }
}

/**
 * Get detailed package statistics
 */
export function getPackageStats(pkg: S4Package): PackageStats {
  return calculatePackageStats(pkg._internal);
}

/**
 * Validate package integrity
 */
export function validatePackageIntegrity(pkg: S4Package): boolean {
  try {
    // Basic validation - check if package can be accessed
    const entries = pkg._internal.entries;
    return entries !== undefined && Array.isArray(entries);
  } catch {
    return false;
  }
}

/**
 * Merge multiple packages into one
 */
export async function mergePackages(filePaths: string[]): Promise<S4Package> {
  try {
    if (filePaths.length === 0) {
      return createEmptyPackage();
    }
    
    // Load packages sequentially to avoid memory pressure with large files
    const packages: S4TKPackage[] = [];
    for (const filePath of filePaths) {
      const fileBuffer = await fs.readFile(filePath);
      packages.push(S4TKPackage.from(fileBuffer));
    }
    
    // Use S4TK's built-in merge functionality with Package objects
    const mergedPkg = S4TKPackage.merge(packages);
    
    const stats = calculatePackageStats(mergedPkg);
    
    return {
      _internal: mergedPkg,
      resourceCount: stats.resourceCount,
      estimatedSize: stats.estimatedSize,
    };
  } catch (error) {
    throw new S4TKError('Failed to merge packages', undefined, error as Error);
  }
}
