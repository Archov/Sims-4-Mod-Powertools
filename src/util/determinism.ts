const ASCII_PRIORITY_LIMIT = 0x7f;

interface SortKey {
  readonly encoded: number[];
  readonly normalizedCodePoints: number[];
}

interface PathPrefixInfo {
  readonly isUnc: boolean;
  readonly hasLeadingSlash: boolean;
  readonly drive: string;
  readonly driveIsAbsolute: boolean;
  readonly remainder: string;
}

interface SegmentResolutionOptions {
  readonly allowRelativeAboveRoot: boolean;
}

/**
 * Deterministically compares two strings and returns their ordering.
 *
 * The comparison is based on NFC-normalized values and a stable sort key that
 * gives ASCII characters priority and uses case-folded primary weights. If the
 * primary encoded keys are identical, comparison falls back to normalized
 * code-point length and finally to a lexicographic comparison of code points.
 *
 * @returns A negative number if `left` < `right`, zero if equal, or a positive
 * number if `left` > `right`.
 */
export function stableCompare(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  const leftKey = buildSortKey(left);
  const rightKey = buildSortKey(right);

  const length = Math.min(leftKey.encoded.length, rightKey.encoded.length);
  for (let index = 0; index < length; index += 1) {
    const delta = leftKey.encoded[index] - rightKey.encoded[index];
    if (delta !== 0) {
      return delta;
    }
  }

  if (leftKey.normalizedCodePoints.length !== rightKey.normalizedCodePoints.length) {
    return leftKey.normalizedCodePoints.length - rightKey.normalizedCodePoints.length;
  }

  return compareCodePoints(leftKey.normalizedCodePoints, rightKey.normalizedCodePoints);
}

/**
 * Compare two filesystem paths deterministically. Paths are normalized to a
 * canonical form before comparison so that Windows/Unix separators and
 * different Unicode representations are treated uniformly.
 */
export function stablePathCompare(left: string, right: string): number {
  const leftNormalized = normalizePath(left);
  const rightNormalized = normalizePath(right);

  if (leftNormalized === rightNormalized) {
    return 0;
  }

  const leftParts = splitPathComponents(leftNormalized);
  const rightParts = splitPathComponents(rightNormalized);

  const length = Math.min(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const delta = stableCompare(leftParts[index], rightParts[index]);
    if (delta !== 0) {
      return delta;
    }
  }

  if (leftParts.length !== rightParts.length) {
    return leftParts.length - rightParts.length;
  }

  return 0;
}

/**
 * Normalize a filesystem path into a cross-platform canonical form.
 *
 * The returned path uses forward slashes, NFC Unicode normalization, and a
 * compact representation: redundant separators are collapsed, `.` segments are
 * removed, and `..` segments are resolved where allowed. Windows-specific
 * prefixes are preserved and handled: extended-length `//?/` prefixes are
 * stripped to their canonical form, UNC prefixes (`//server/share`) are
 * recognized, and drive letters (`C:` / `C:/`) are honored (absolute drives
 * prevent ascending above the drive root).
 *
 * @param inputPath - The path to normalize. An empty string returns `"."`.
 * @returns The normalized, canonical path suitable for deterministic comparisons.
 */
export function normalizePath(inputPath: string): string {
  if (inputPath === '') {
    return '.';
  }

  const normalized = stripExtendedLengthPrefix(inputPath);
  const prefix = analyzePathPrefix(normalized);
  const segments = resolvePathSegments(prefix.remainder, {
    allowRelativeAboveRoot: !(prefix.isUnc || prefix.hasLeadingSlash || prefix.driveIsAbsolute),
  });

  return rebuildNormalizedPath(prefix, segments);
}

/**
 * Perform a stable sort by string key. Identical keys preserve their original
 * relative order.
 */
export function stableSortBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  return items
    .map((item, index) => ({ item, index, key: keyFn(item) }))
    .sort((left, right) => {
      const delta = stableCompare(left.key, right.key);
      if (delta !== 0) {
        return delta;
      }
      return left.index - right.index;
    })
    .map(entry => entry.item);
}

/**
 * Build a deterministic SortKey for a string used for stable ordering.
 *
 * The input is NFC-normalized and iterated by Unicode characters. For each character
 * the key appends a small primary-weight sequence: an ASCII-priority flag (0 for
 * code points <= 0x7f, 1 otherwise), the code points of the character's folded
 * (lowercased) NFC form, and finally the original character code point. The function
 * also returns the sequence of NFC-normalized code points for fallback comparisons.
 *
 * @param raw - The source string to encode into a SortKey (will be NFC-normalized).
 * @returns An object with `encoded` (the primary comparison weights) and
 * `normalizedCodePoints` (NFC-normalized code point sequence of `raw`).
 */
function buildSortKey(raw: string): SortKey {
  const normalized = raw.normalize('NFC');
  const encoded: number[] = [];
  const normalizedCodePoints: number[] = [];

  for (const char of normalized) {
    const codePoint = char.codePointAt(0) ?? 0;
    normalizedCodePoints.push(codePoint);

    const asciiPriority = codePoint <= ASCII_PRIORITY_LIMIT ? 0 : 1;
    encoded.push(asciiPriority);

    const folded = char.toLowerCase().normalize('NFC');
    for (const foldedChar of folded) {
      encoded.push(foldedChar.codePointAt(0) ?? 0);
    }

    encoded.push(codePoint);
  }

  return { encoded, normalizedCodePoints };
}

/**
 * Lexicographically compares two sequences of Unicode code points.
 *
 * Compares corresponding elements from `left` and `right` until a difference is found,
 * returning the signed difference of the first unequal pair. If all compared elements
 * are equal, the shorter array is considered smaller.
 *
 * @param left - First array of Unicode code points.
 * @param right - Second array of Unicode code points.
 * @returns A negative number if `left < right`, positive if `left > right`, or `0` if equal.
 */
function compareCodePoints(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const delta = left[index] - right[index];
    if (delta !== 0) {
      return delta;
    }
  }

  return left.length - right.length;
}

/**
 * Splits a normalized filesystem path into its path components with special handling for UNC prefixes, drive letters, and leading slashes.
 *
 * The function expects a path already normalized to use forward slashes and NFC normalization. It returns an array of components where:
 * - A path that begins with "//" is treated as a UNC-like prefix and is split into ["//", ...rest] (or ["//"] for exactly "//").
 * - A Windows drive prefix like "C:" is returned as the first component; if followed by a slash the next component will be "/" to denote an absolute drive (e.g. ["C:", "/", ...]), otherwise the remainder is split normally (e.g. ["C:", "dir", "file"] or ["C:"] for just the drive).
 * - A path that begins with a single "/" returns ["/", ...rest] (or ["/"] for the root only).
 * - In all other cases the path is split on "/" and the segments are returned.
 *
 * @param path - A normalized path (forward slashes, NFC) to decompose.
 * @returns An array of path components reflecting prefixes and segment boundaries.
 */
export function splitPathComponents(path: string): string[] {
  if (path.startsWith('//')) {
    const rest = path.slice(2);
    if (rest.length === 0) {
      return ['//'];
    }
    return ['//', ...rest.split('/')];
  }

  const driveMatch = path.match(/^[A-Z]:/u);
  if (driveMatch) {
    const drive = driveMatch[0];
    const remainder = path.slice(drive.length);
    if (remainder.startsWith('/')) {
      const rest = remainder.slice(1);
      if (rest.length === 0) {
        return [drive, '/'];
      }
      return [drive, '/', ...rest.split('/')];
    }
    if (remainder.length === 0) {
      return [drive];
    }
    return [drive, ...remainder.split('/')];
  }

  if (path.startsWith('/')) {
    const rest = path.slice(1);
    if (rest.length === 0) {
      return ['/'];
    }
    return ['/', ...rest.split('/')];
  }

  return path.split('/');
}

/**
 * Normalize a path string to Unicode NFC and convert backslashes to forward slashes.
 *
 * Returns the input string with Unicode normalized to NFC and every `\` replaced by `/`.
 *
 * @param path - The path string to normalize.
 * @returns The NFC-normalized path using forward slashes.
 */
function normalizeUnicodeAndSlashes(path: string): string {
  return path.normalize('NFC').replace(/\\/g, '/');
}

/**
 * Remove the Windows extended-length `\\?\` prefix from a path after normalizing Unicode and slashes.
 *
 * The input is first normalized to NFC and backslashes are converted to forward slashes.
 * - If the normalized path starts with `//?/UNC/`, it is converted to a standard UNC form (`//server/share/...`).
 * - If the normalized path starts with `//?/` (but not `//?/UNC/`), the leading `//?/` is removed.
 * - If no extended-length prefix is present, the normalized path is returned unchanged.
 *
 * @param path - Input filesystem path (may use backslashes or contain an extended-length prefix)
 * @returns The normalized path with any `\\?\` extended-length prefix removed
 */
function stripExtendedLengthPrefix(path: string): string {
  const normalized = normalizeUnicodeAndSlashes(path);

  if (!normalized.startsWith('//?/')) {
    return normalized;
  }

  if (normalized.startsWith('//?/UNC/')) {
    return `//${normalized.slice(8)}`;
  }

  return normalized.slice(4);
}

/**
 * Extracts and classifies the leading prefix of a filesystem path.
 *
 * The function detects UNC prefixes (paths starting with `//` where the third character is not `/`),
 * leading slash(es), and Windows drive-letter prefixes (e.g. `C:`). It returns the remainder of the
 * path with the identified prefix characters removed and canonicalizes the drive letter to upper-case.
 *
 * Examples of classification:
 * - `//server/share/path` -> isUnc=true, remainder="server/share/path"
 * - `///a/b` or `/a/b`    -> hasLeadingSlash=true, remainder="a/b"
 * - `C:\dir\file`         -> drive="C:", driveIsAbsolute=true, remainder="dir/file"
 * - `C:relative/path`     -> drive="C:", driveIsAbsolute=false, remainder="relative/path"
 *
 * @param path - The input path (forward slashes expected); leading `//?/` extended prefixes should be stripped beforehand.
 * @returns An object describing the detected prefix:
 *  - isUnc: true when the path is UNC-style (`//` followed by a non-`/` character).
 *  - hasLeadingSlash: true when the path began with one or more slashes but is not a UNC.
 *  - drive: upper-case drive letter with trailing colon (e.g., `"C:"`) when present, otherwise `""`.
 *  - driveIsAbsolute: true when a drive letter is followed by a slash (e.g., `C:/...`).
 *  - remainder: the remaining path after removing the detected prefix and any leading slashes.
 */
function analyzePathPrefix(path: string): PathPrefixInfo {
  let working = path;
  let isUnc = false;
  let hasLeadingSlash = false;

  if (working.startsWith('//')) {
    if (working.length > 2 && working[2] !== '/') {
      isUnc = true;
      working = working.slice(2);
    } else {
      hasLeadingSlash = true;
      working = working.replace(/^\/+/, '');
    }
  } else if (working.startsWith('/')) {
    hasLeadingSlash = true;
    working = working.replace(/^\/+/, '');
  }

  let drive = '';
  let driveIsAbsolute = false;

  if (!isUnc) {
    const driveMatch = working.match(/^[A-Za-z]:/u);
    if (driveMatch) {
      drive = driveMatch[0].toUpperCase();
      working = working.slice(drive.length);

      if (working.startsWith('/')) {
        driveIsAbsolute = true;
        working = working.replace(/^\/+/, '');
      }
    }
  }

  return { isUnc, hasLeadingSlash, drive, driveIsAbsolute, remainder: working };
}

/**
 * Resolve a path string into normalized segments, handling ".", "..", and redundant slashes.
 *
 * Splits the input (after NFC normalization and backslash→slash conversion) on '/' and
 * produces a list of path segments with '.' and empty segments removed. Parent-directory
 * segments ('..') pop the previous non-'..' segment when possible; if no previous segment
 * exists or the previous segment is also '..', behavior depends on options.
 *
 * @param path - The input path to split and normalize (may contain backslashes or non‑NFC text).
 * @param options - Resolution options.
 * @param options.allowRelativeAboveRoot - If true, preserve '..' segments that would ascend
 *   above the root (they are retained in the returned array). If false, such '..' segments
 *   are discarded.
 * @returns An array of resolved path segments (no '.' or empty segments, '..' included only
 *   according to the above rules).
 */
function resolvePathSegments(path: string, options: SegmentResolutionOptions): string[] {
  const rawSegments = normalizeUnicodeAndSlashes(path).split('/');
  const segments: string[] = [];

  for (const rawSegment of rawSegments) {
    if (rawSegment === '' || rawSegment === '.') {
      continue;
    }

    if (rawSegment === '..') {
      if (segments.length > 0 && segments[segments.length - 1] !== '..') {
        segments.pop();
        continue;
      }

      if (!options.allowRelativeAboveRoot) {
        continue;
      }

      segments.push('..');
      continue;
    }

    segments.push(rawSegment);
  }

  return segments;
}

/**
 * Reconstructs a canonical path string from a parsed prefix and resolved path segments.
 *
 * The returned path uses forward slashes and encodes special prefix semantics:
 * - UNC prefix (prefix.isUnc): returns `//` when no segments, otherwise `//` + joined segments.
 * - Drive prefix (prefix.drive):
 *   - If driveIsAbsolute: returns `DRIVE/` when no segments or `DRIVE/segment/...` otherwise.
 *   - If not absolute and no segments: returns the drive token (e.g., `C:`).
 *   - Otherwise returns `DRIVE` immediately followed by the joined segments (no extra slash).
 * - Leading slash (prefix.hasLeadingSlash): returns `/` when no segments or `/<joined segments>` otherwise.
 * - No prefix and no segments: returns `.`.
 * - Otherwise returns the joined segments.
 *
 * @param prefix - Parsed prefix information (UNC, drive, leading slash and remainder metadata).
 * @param segments - Resolved, canonical path segments to join into the final path.
 * @returns A normalized, platform-agnostic path string built from the prefix and segments.
 */
function rebuildNormalizedPath(prefix: PathPrefixInfo, segments: string[]): string {
  if (prefix.isUnc) {
    if (segments.length === 0) {
      return '//';
    }
    return `//${segments.join('/')}`;
  }

  if (prefix.drive !== '') {
    if (prefix.driveIsAbsolute) {
      const suffix = segments.join('/');
      return suffix.length > 0 ? `${prefix.drive}/${suffix}` : `${prefix.drive}/`;
    }

    if (segments.length === 0) {
      return prefix.drive;
    }

    return `${prefix.drive}${segments.join('/')}`;
  }

  if (prefix.hasLeadingSlash) {
    const suffix = segments.join('/');
    return suffix.length > 0 ? `/${suffix}` : '/';
  }

  if (segments.length === 0) {
    return '.';
  }

  return segments.join('/');
}
