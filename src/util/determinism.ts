const ASCII_PRIORITY_LIMIT = 0x7f;

interface SortKey {
  readonly encoded: number[];
  readonly normalizedCodePoints: number[];
}

/**
 * Compare two strings deterministically with predictable ordering across
 * platforms. Comparison is performed on NFC-normalized strings using a
 * case-folded primary weight (ASCII-first) with code point fallbacks.
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

  return stableCompare(leftNormalized, rightNormalized);
}

/**
 * Normalize a filesystem path to a cross-platform canonical representation.
 * The result always uses forward slashes, resolves "." segments, collapses
 * redundant separators, honours Windows drive letters/UNC prefixes, and
 * applies NFC Unicode normalization.
 */
export function normalizePath(inputPath: string): string {
  if (inputPath === '') {
    return '.';
  }

  let working = inputPath.normalize('NFC').replace(/\\/g, '/');

  if (working.startsWith('//?/')) {
    if (working.startsWith('//?/UNC/')) {
      working = `//${working.slice(8)}`;
    } else {
      working = working.slice(4);
    }
  }

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
  if (!isUnc) {
    const driveMatch = working.match(/^[A-Za-z]:/u);
    if (driveMatch) {
      drive = driveMatch[0].toUpperCase();
      working = working.slice(drive.length);
    }
  }

  let driveIsAbsolute = false;
  if (drive !== '') {
    if (working.startsWith('/')) {
      driveIsAbsolute = true;
      working = working.replace(/^\/+/, '');
    }
  }

  const rawSegments = working.split('/');
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

      if (isUnc || hasLeadingSlash || driveIsAbsolute) {
        continue;
      }

      segments.push('..');
      continue;
    }

    segments.push(rawSegment);
  }

  if (isUnc) {
    if (segments.length === 0) {
      return '//';
    }
    return `//${segments.join('/')}`;
  }

  if (drive !== '') {
    if (driveIsAbsolute) {
      const suffix = segments.join('/');
      return suffix.length > 0 ? `${drive}/${suffix}` : `${drive}/`;
    }

    if (segments.length === 0) {
      return drive;
    }

    return `${drive}${segments.join('/')}`;
  }

  if (hasLeadingSlash) {
    const suffix = segments.join('/');
    return suffix.length > 0 ? `/${suffix}` : '/';
  }

  if (segments.length === 0) {
    return '.';
  }

  return segments.join('/');
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

function splitPathComponents(path: string): string[] {
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
