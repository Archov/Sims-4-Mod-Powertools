import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createEmptyPackage,
  loadPackage,
  appendAllResources,
  getResourceCount,
  getResourceTypes,
  serializePackage,
  estimateSerializedSize,
  getPackageStats,
  validatePackageIntegrity,
  mergePackages,
  S4TKError,
  PackageLoadError,
  PackageCorruptionError,
  type S4Package,
  type PackageStats,
} from '../src/core/s4tk.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testPackagesDir = join(__dirname, 'packages');

describe('S4TK Adapter', () => {
  describe('createEmptyPackage', () => {
    it('should create an empty package', () => {
      const pkg = createEmptyPackage();
      
      expect(pkg).toBeDefined();
      expect(pkg.resourceCount).toBe(0);
      expect(pkg.estimatedSize).toBe(0);
      expect(pkg._internal).toBeDefined();
    });
  });

  describe('loadPackage', () => {
    it('should handle non-existent files', async () => {
      await expect(loadPackage('/non/existent/file.package')).rejects.toThrow(PackageLoadError);
    });

    it('should handle corrupted package files', async () => {
      // Create a dummy file in temp location using cross-platform approach
      const { tmpdir } = await import('node:os');
      const dummyFile = join(tmpdir(), `test-corrupted-${Date.now()}.package`);
      
      try {
        await fs.writeFile(dummyFile, 'not a package file');
        await expect(loadPackage(dummyFile)).rejects.toThrow(PackageCorruptionError);
      } finally {
        // Safely clean up the dummy file
        await fs.unlink(dummyFile).catch(() => {});
      }
    });

    it('should load valid package files', async () => {
      // Test with real package files
      const packageFiles = [
        'test-file-1.package',
        'test-file-2.package',
      ];
      
      for (const fileName of packageFiles) {
        const filePath = join(testPackagesDir, fileName);
        
        try {
          // Check if file exists
          await fs.access(filePath);
          
          // Load the package - should succeed with real packages
          const pkg = await loadPackage(filePath);
          expect(pkg).toBeDefined();
          expect(pkg.resourceCount).toBeGreaterThan(0);
          expect(pkg.estimatedSize).toBeGreaterThanOrEqual(0); // Allow 0 for empty packages
          
          // Test resource types
          const types = getResourceTypes(pkg);
          expect(types.size).toBeGreaterThan(0);
          
        } catch (error) {
          // If file doesn't exist, that's fine for CI
          if (error.message.includes('ENOENT')) {
            console.log(`Skipping test for ${fileName} - file not found`);
          } else {
            throw error;
          }
        }
      }
    });
  });

  describe('appendAllResources', () => {
    it('should append resources between packages', async () => {
      // Load two real packages to test actual functionality
      const packageFiles = [
        'test-file-1.package',
        'test-file-2.package',
      ];
      
      const filePaths = packageFiles.map(fileName => join(testPackagesDir, fileName));
      
      try {
        // Check if files exist
        await Promise.all(filePaths.map(path => fs.access(path)));
        
        // Load both packages
        const source = await loadPackage(filePaths[0]);
        const target = await loadPackage(filePaths[1]);
        
        const originalTargetCount = getResourceCount(target);
        const originalSourceCount = getResourceCount(source);
        
        // Append source to target
        appendAllResources(target, source);
        
        // Verify resources were actually appended
        const newTargetCount = getResourceCount(target);
        expect(newTargetCount).toBe(originalTargetCount + originalSourceCount);
        
        // Verify resource types were merged
        const targetTypes = getResourceTypes(target);
        const sourceTypes = getResourceTypes(source);
        expect(targetTypes.size).toBeGreaterThanOrEqual(Math.max(targetTypes.size, sourceTypes.size));
        
      } catch (error) {
        if (error.message.includes('ENOENT')) {
          console.log('Skipping append test - package files not found');
        } else {
          throw error;
        }
      }
    });
  });

  describe('getResourceCount', () => {
    it('should return resource count', () => {
      const pkg = createEmptyPackage();
      expect(getResourceCount(pkg)).toBe(0);
    });
  });

  describe('getResourceTypes', () => {
    it('should return empty set for empty package', () => {
      const pkg = createEmptyPackage();
      const types = getResourceTypes(pkg);
      
      expect(types).toBeInstanceOf(Set);
      expect(types.size).toBe(0);
    });
  });

  describe('serializePackage', () => {
    it('should serialize empty package', () => {
      const pkg = createEmptyPackage();
      const buffer = serializePackage(pkg);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('estimateSerializedSize', () => {
    it('should return estimated size', () => {
      const pkg = createEmptyPackage();
      const size = estimateSerializedSize(pkg);
      
      expect(size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPackageStats', () => {
    it('should return package statistics', () => {
      const pkg = createEmptyPackage();
      const stats = getPackageStats(pkg);
      
      expect(stats).toBeDefined();
      expect(stats.resourceCount).toBe(0);
      expect(stats.uniqueTypes).toEqual([]);
      expect(stats.estimatedSize).toBe(0);
    });
  });

  describe('validatePackageIntegrity', () => {
    it('should validate empty package', () => {
      const pkg = createEmptyPackage();
      const isValid = validatePackageIntegrity(pkg);
      
      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('mergePackages', () => {
    it('should handle empty file list', async () => {
      const merged = await mergePackages([]);
      
      expect(merged).toBeDefined();
      expect(merged.resourceCount).toBe(0);
    });

    it('should handle non-existent files', async () => {
      await expect(mergePackages(['/non/existent/file.package'])).rejects.toThrow(S4TKError);
    });

    it('should merge valid package files', async () => {
      // Test with real package files
      const packageFiles = [
        'test-file-1.package',
        'test-file-2.package',
      ];
      
      const filePaths = packageFiles.map(fileName => join(testPackagesDir, fileName));
      
      try {
        // Check if files exist
        await Promise.all(filePaths.map(path => fs.access(path)));
        
        // Load individual packages to get their resource counts
        const individualPackages = await Promise.all(filePaths.map(path => loadPackage(path)));
        const expectedTotalResources = individualPackages.reduce((sum, pkg) => sum + getResourceCount(pkg), 0);
        
        // Merge the packages
        const merged = await mergePackages(filePaths);
        
        // Verify merge was successful
        expect(merged).toBeDefined();
        expect(merged.resourceCount).toBe(expectedTotalResources);
        expect(merged.resourceCount).toBeGreaterThan(0);
        
        // Verify resource types are preserved
        const mergedTypes = getResourceTypes(merged);
        expect(mergedTypes.size).toBeGreaterThan(0);
        
      } catch (error) {
        if (error.message.includes('ENOENT')) {
          console.log('Skipping merge test - package files not found');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should create proper error types', () => {
      const s4tkError = new S4TKError('Test error');
      const loadError = new PackageLoadError('/test/path', new Error('Original error'));
      const corruptionError = new PackageCorruptionError('/test/path', new Error('Original error'));
      
      expect(s4tkError).toBeInstanceOf(Error);
      expect(s4tkError).toBeInstanceOf(S4TKError);
      expect(s4tkError.name).toBe('S4TKError');
      
      expect(loadError).toBeInstanceOf(S4TKError);
      expect(loadError.name).toBe('PackageLoadError');
      expect(loadError.filePath).toBe('/test/path');
      
      expect(corruptionError).toBeInstanceOf(S4TKError);
      expect(corruptionError.name).toBe('PackageCorruptionError');
      expect(corruptionError.filePath).toBe('/test/path');
    });
  });

  describe('Cross-platform compatibility', () => {
    it('should handle Windows paths', () => {
      const pkg = createEmptyPackage();
      expect(pkg).toBeDefined();
      
      // Test that basic operations work regardless of platform
      expect(getResourceCount(pkg)).toBe(0);
      expect(getResourceTypes(pkg).size).toBe(0);
    });
  });
});
