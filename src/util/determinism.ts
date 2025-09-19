export function stableCompare(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  const leftKey = toSortKey(left);
  const rightKey = toSortKey(right);
  const length = Math.min(leftKey.length, rightKey.length);

  for (let index = 0; index < length; index += 1) {
    const delta = leftKey[index] - rightKey[index];
    if (delta !== 0) {
      return delta;
    }
  }

  return left.length - right.length;
}

function toSortKey(value: string): number[] {
  const key: number[] = [];
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    const lower = char.toLowerCase();
    const lowerCodePoint = lower.codePointAt(0) ?? codePoint;
    const asciiPriority = codePoint <= 0x7f ? 0 : 1;

    key.push(asciiPriority, lowerCodePoint, codePoint);
  }
  return key;
}