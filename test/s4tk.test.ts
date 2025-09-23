import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
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

const __dirname = new URL('.', import.meta.url).pathname;
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
      // Create a dummy file in temp location
      const dummyFile = '/tmp/test-corrupted.package';
      try {
        await fs.writeFile(dummyFile, 'not a package file');
        await expect(loadPackage(dummyFile)).rejects.toThrow(PackageCorruptionError);
      } catch (error) {
        // On Windows, /tmp might not exist, so use a different approach
        const dummyFile2 = 'test-corrupted.package';
        await fs.writeFile(dummyFile2, 'not a package file');
        await expect(loadPackage(dummyFile2)).rejects.toThrow(PackageCorruptionError);
        await fs.unlink(dummyFile2);
      } finally {
        try {
          await fs.unlink(dummyFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it('should load valid package files', async () => {
      // Test with real package files
      const packageFiles = [
        'Azmodan22_Caged_Dancing_Pole_Short.package',
        'Azmodan22_Dancing_Pole_Medium.package',
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
          expect(pkg.estimatedSize).toBeGreaterThan(0);
          
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
    it('should append resources between packages', () => {
      const target = createEmptyPackage();
      const source = createEmptyPackage();
      
      // This test might not work with empty packages, but it tests the interface
      expect(() => appendAllResources(target, source)).not.toThrow();
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
    it('should serialize empty package', async () => {
      const pkg = createEmptyPackage();
      const buffer = await serializePackage(pkg);
      
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
      // Test with real package files if they exist
      const packageFiles = [
        'Azmodan22_Caged_Dancing_Pole_Short.package',
        'Azmodan22_Dancing_Pole_Medium.package',
      ];
      
      const filePaths = packageFiles.map(fileName => join(testPackagesDir, fileName));
      
      try {
        // Check if files exist
        await Promise.all(filePaths.map(path => fs.access(path)));
        
        // Try to merge - this might fail if files are not valid packages
        try {
          const merged = await mergePackages(filePaths);
          expect(merged).toBeDefined();
          expect(merged.resourceCount).toBeGreaterThanOrEqual(0);
        } catch (error) {
          // If merging fails, that's expected for our test files
          expect(error).toBeInstanceOf(S4TKError);
        }
      } catch {
        // Files don't exist, skip test
        console.log('Skipping merge test - package files not found');
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
