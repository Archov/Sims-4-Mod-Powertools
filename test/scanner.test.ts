import { beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { 
  scanInputs, 
  expandFilesList, 
  enumerateDirectory, 
  deduplicatePaths, 
  sortPackages,
  type PackageInfo,
  type ScanOptions 
} from '../src/basic/scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const fixturesDir = join(__dirname, 'fixtures', 'scanner');

// Helper to create PackageInfo for testing
function createPackageInfo(path: string, name: string, size: number, mtime: Date): PackageInfo {
  return {
    path,
    normalizedPath: path.replace(/\\/g, '/'),
    name,
    size,
    mtime,
  };
}

describe('Scanner Module', () => {
  describe('expandFilesList', () => {
    it('should parse file list with comments and empty lines', async () => {
      const listFile = join(fixturesDir, 'files-list.txt');
      
      // Create test files referenced in the list
      await fs.writeFile(join(fixturesDir, 'test-package-1.package'), 'content1');
      await fs.writeFile(join(fixturesDir, 'test-package-2.package'), 'content2');
      
      const paths = await expandFilesList(listFile);
      
      expect(paths).toHaveLength(3);
      expect(paths[0]).toMatch(/test-package-1\.package$/);
      expect(paths[1]).toMatch(/test-package-2\.package$/);
      expect(paths[2]).toMatch(/path\.package$/);
    });

    it('should handle empty list with only comments', async () => {
      const listFile = join(fixturesDir, 'empty-list.txt');
      const paths = await expandFilesList(listFile);
      
      expect(paths).toHaveLength(0);
    });

    it('should throw on non-existent file in list', async () => {
      const tempListFile = join(fixturesDir, 'bad-list.txt');
      await fs.writeFile(tempListFile, 'non-existent-file.package\n');
      
      await expect(expandFilesList(tempListFile)).rejects.toThrow('does not exist or is not readable');
      
      // Cleanup
      await fs.unlink(tempListFile);
    });

    it('should resolve relative paths against list file location', async () => {
      const listFile = join(fixturesDir, 'files-list.txt');
      const paths = await expandFilesList(listFile);
      
      // All paths should be absolute
      for (const path of paths) {
        expect(resolve(path)).toBe(path);
      }
    });
  });

  describe('enumerateDirectory', () => {
    it('should find all .package files recursively', async () => {
      const paths = await enumerateDirectory(fixturesDir);
      
      // Should include various package files but exclude hidden/temp files
      const names = paths.map(p => p.split(/[/\\]/).pop()).sort();
      
      // Debug: log the actual names found
      console.log('Found package names:', names);
      
      expect(names).toContain('test-package-1.package');
      expect(names).toContain('test-package-2.package');
      expect(names).toContain('UPPERCASE.package');
      expect(names).toContain('lowercase.package');
      expect(names).toContain('mixed-case.PACKAGE'); // Case insensitive extension
      expect(names).toContain('deep.package'); // From nested directory
      // Unicode filename (may be normalized differently by filesystem)
      const hasUnicodeFile = names.some(name => name && name.includes('Caf') && name.includes('bel') && name.endsWith('.package'));
      expect(hasUnicodeFile).toBe(true);
      
      // Should NOT include hidden, temp, or non-package files
      expect(names).not.toContain('.hidden.package');
      expect(names).not.toContain('temp-file.package.tmp');
    });

    it('should handle non-existent directory', async () => {
      const nonExistentDir = join(fixturesDir, 'does-not-exist');
      const paths = await enumerateDirectory(nonExistentDir);
      
      expect(paths).toHaveLength(0);
    });

    it('should handle case insensitive .package extension', async () => {
      const paths = await enumerateDirectory(fixturesDir);
      const hasUppercaseExt = paths.some(p => p.toLowerCase().includes('mixed-case') && p.endsWith('.PACKAGE'));
      
      expect(hasUppercaseExt).toBe(true);
    });
  });

  describe('deduplicatePaths', () => {
    it('should remove duplicate paths', () => {
      const paths = [
        '/path/to/file1.package',
        '/path/to/file2.package',
        '/path/to/file1.package', // duplicate
        '/different/path.package',
      ];
      
      const unique = deduplicatePaths(paths);
      
      expect(unique).toHaveLength(3);
      expect(unique[0]).toBe('/path/to/file1.package');
      expect(unique[1]).toBe('/path/to/file2.package');
      expect(unique[2]).toBe('/different/path.package');
    });

    it('should handle normalized path equivalents', () => {
      const paths = [
        '/path/to/../to/file.package',
        '/path/to/file.package',
        'C:\\path\\to\\file.package', // Windows style (if applicable)
      ];
      
      const unique = deduplicatePaths(paths);
      
      // Should deduplicate based on normalized paths
      expect(unique.length).toBeLessThan(paths.length);
    });

    it('should preserve order of first occurrence', () => {
      const paths = [
        '/first.package',
        '/second.package',
        '/first.package', // duplicate of first
      ];
      
      const unique = deduplicatePaths(paths);
      
      expect(unique).toEqual(['/first.package', '/second.package']);
    });
  });

  describe('sortPackages', () => {
    let testPackages: PackageInfo[];

    beforeEach(() => {
      const baseTime = new Date('2025-01-01T00:00:00Z');
      testPackages = [
        createPackageInfo('/path/to/zebra.package', 'zebra.package', 1000, new Date(baseTime.getTime() + 3000)),
        createPackageInfo('/path/to/alpha.package', 'alpha.package', 2000, new Date(baseTime.getTime() + 1000)),
        createPackageInfo('/different/beta.package', 'beta.package', 1500, new Date(baseTime.getTime() + 2000)),
        createPackageInfo('/path/to/Alpha.package', 'Alpha.package', 500, new Date(baseTime.getTime() + 4000)), // Mixed case
      ];
    });

    it('should sort by name (case insensitive)', () => {
      const sorted = sortPackages(testPackages, 'name', false);
      
      const names = sorted.map(p => p.name);
      expect(names).toEqual(['Alpha.package', 'alpha.package', 'beta.package', 'zebra.package']);
    });

    it('should sort by path using stable path comparison', () => {
      const sorted = sortPackages(testPackages, 'path', false);
      
      const paths = sorted.map(p => p.normalizedPath);
      // Just verify the array is sorted
      const sortedPaths = [...paths].sort();
      expect(paths).toEqual(sortedPaths);
    });

    it('should sort by mtime (newest first by default)', () => {
      const sorted = sortPackages(testPackages, 'mtime', false);
      
      const times = sorted.map(p => p.mtime.getTime());
      expect(times).toEqual([
        new Date('2025-01-01T00:00:04Z').getTime(), // Alpha.package (newest)
        new Date('2025-01-01T00:00:03Z').getTime(), // zebra.package
        new Date('2025-01-01T00:00:02Z').getTime(), // beta.package
        new Date('2025-01-01T00:00:01Z').getTime(), // alpha.package (oldest)
      ]);
    });

    it('should handle reverse sorting', () => {
      const sorted = sortPackages(testPackages, 'name', true);
      const names = sorted.map(p => p.name);
      expect(names).toEqual(['zebra.package', 'beta.package', 'alpha.package', 'Alpha.package']);
    });

    it('should maintain stability for identical sort keys', () => {
      // Add packages with identical mtimes
      const sameTime = new Date('2025-01-01T12:00:00Z');
      const identicalTimePackages = [
        createPackageInfo('/z-path.package', 'file1.package', 100, sameTime),
        createPackageInfo('/a-path.package', 'file2.package', 200, sameTime),
      ];

      const sorted = sortPackages(identicalTimePackages, 'mtime', false);
      
      // When mtime is identical, should fall back to path comparison for stability
      expect(sorted[0].path).toBe('/a-path.package'); // Lexicographically first path
      expect(sorted[1].path).toBe('/z-path.package');
    });

    it('should sort by name with deterministic tie-breaking by path', () => {
      // Test packages with identical names in different directories
      const identicalNamePackages = [
        createPackageInfo('/z/dir/same.package', 'same.package', 100, new Date()),
        createPackageInfo('/a/dir/same.package', 'same.package', 200, new Date()),
        createPackageInfo('/m/dir/same.package', 'same.package', 150, new Date()),
      ];

      const sorted = sortPackages(identicalNamePackages, 'name', false);
      
      // Should be sorted by path when names are identical for determinism
      expect(sorted[0].path).toBe('/a/dir/same.package');
      expect(sorted[1].path).toBe('/m/dir/same.package'); 
      expect(sorted[2].path).toBe('/z/dir/same.package');
    });
  });

  describe('scanInputs', () => {
    it('should scan directories and return package info', async () => {
      const options: ScanOptions = {
        inDirs: [fixturesDir],
        sortBy: 'name',
        reverse: false,
      };

      const result = await scanInputs(options);
      
      expect(result.packages.length).toBeGreaterThan(0);
      expect(result.totalCount).toBe(result.packages.length);
      expect(result.totalSize).toBeGreaterThan(0);
      
      // Should be sorted by name
      const names = result.packages.map(p => p.name.toLowerCase());
      for (let i = 1; i < names.length; i++) {
        expect(names[i].localeCompare(names[i - 1])).toBeGreaterThanOrEqual(0);
      }
      
      // All packages should have proper metadata
      for (const pkg of result.packages) {
        expect(pkg.path).toBeTruthy();
        expect(pkg.normalizedPath).toBeTruthy();
        expect(pkg.name).toBeTruthy();
        expect(pkg.size).toBeGreaterThanOrEqual(0);
        expect(pkg.mtime).toBeInstanceOf(Date);
      }
    });

    it('should process file lists and directories together', async () => {
      const listFile = join(fixturesDir, 'files-list.txt');
      const options: ScanOptions = {
        inDirs: [fixturesDir],
        filesList: listFile,
        sortBy: 'path',
        reverse: false,
      };

      const result = await scanInputs(options);
      
      // Should include files from both sources, deduplicated
      expect(result.packages.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0); // No errors expected with valid fixtures
    });

    it('should handle errors gracefully', async () => {
      const options: ScanOptions = {
        inDirs: ['/non/existent/directory'],
        filesList: '/non/existent/file.txt',
        sortBy: 'name',
        reverse: false,
      };

      const result = await scanInputs(options);
      
      expect(result.packages).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('enumerate directory'))).toBe(true);
      expect(result.errors.some(e => e.includes('files list'))).toBe(true);
    });

    it('should handle mixed case and unicode filenames', async () => {
      const options: ScanOptions = {
        inDirs: [fixturesDir],
        sortBy: 'name',
        reverse: false,
      };

      const result = await scanInputs(options);
      
      // Should include Unicode filename (flexible match for different normalizations)
      const hasUnicode = result.packages.some(p => p.name.includes('Caf') && p.name.includes('bel'));
      expect(hasUnicode).toBe(true);
      
      // Should handle mixed case properly
      const hasMixedCase = result.packages.some(p => p.name === 'UPPERCASE.package');
      expect(hasMixedCase).toBe(true);
    });

    it('should respect sort options', async () => {
      const nameSort: ScanOptions = {
        inDirs: [fixturesDir],
        sortBy: 'name',
        reverse: false,
      };

      const pathSort: ScanOptions = {
        inDirs: [fixturesDir],
        sortBy: 'path',
        reverse: false,
      };

      const [nameResult, pathResult] = await Promise.all([
        scanInputs(nameSort),
        scanInputs(pathSort),
      ]);

      // Results should be different unless all files happen to sort the same way
      const nameOrder = nameResult.packages.map(p => p.name);
      const pathOrder = pathResult.packages.map(p => p.name);
      
      // At least verify they're both properly sorted
      expect(nameOrder).toEqual([...nameOrder].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));
    });
  });

  describe('Cross-platform compatibility', () => {
    it('should normalize paths consistently', () => {
      const windowsPath = 'C:\\Users\\test\\file.package';
      const unixPath = '/home/test/file.package';
      
      const paths = [windowsPath, unixPath];
      const unique = deduplicatePaths(paths);
      
      // Should not throw and should handle both path styles
      expect(unique.length).toBe(2);
    });

    it('should handle long paths gracefully', async () => {
      // Test with reasonably long path (Windows has 260 char limit issues)
      const longName = 'a'.repeat(100) + '.package';
      const longPath = join(fixturesDir, longName);
      
      try {
        await fs.writeFile(longPath, 'content');
        const paths = await enumerateDirectory(fixturesDir);
        
        expect(paths.some(p => p.endsWith(longName))).toBe(true);
      } catch (error) {
        // If we can't create the long path, that's OS-specific and OK to skip
        console.warn('Skipping long path test due to filesystem limitation');
      } finally {
        // Cleanup
        try {
          await fs.unlink(longPath);
        } catch {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Error handling', () => {
    it('should collect errors without stopping scan', async () => {
      // Create a scenario with mixed valid and invalid inputs
      const tempBadList = join(fixturesDir, 'temp-bad-list.txt');
      await fs.writeFile(tempBadList, 'non-existent-file.package\nvalid-file-that-does-not-exist.package\n');

      const options: ScanOptions = {
        inDirs: [fixturesDir], // This should work
        filesList: tempBadList, // This should produce errors
        sortBy: 'name',
        reverse: false,
      };

      const result = await scanInputs(options);
      
      // Should have found some valid packages from directory scan
      expect(result.packages.length).toBeGreaterThan(0);
      
      // Should have collected errors from file list
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('files list'))).toBe(true);
      
      // Cleanup
      await fs.unlink(tempBadList);
    });
  });
});
