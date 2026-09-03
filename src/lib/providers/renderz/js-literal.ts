import JSON5 from "json5";

export function extractBalanced(source: string, openIndex: number): string | undefined {
  const open = source[openIndex];
  const close = open === "{" ? "}" : open === "[" ? "]" : undefined;
  if (!close) {
    return undefined;
  }
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = ch;
      continue;
    }
    if (ch === open) {
      depth += 1;
    } else if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openIndex, i + 1);
      }
    }
  }
  return undefined;
}

export function parseJsLiteral<T>(literal: string): T {
  const normalized = literal.replaceAll(/\bvoid 0\b/g, "null");
  return JSON5.parse(normalized) as T;
}

export function extractJsAssignment<T>(source: string, marker: string): T | undefined {
  const index = source.indexOf(marker);
  if (index < 0) {
    return undefined;
  }
  const after = source.slice(index + marker.length);
  const rel = after.search(/[\[{]/);
  if (rel < 0) {
    return undefined;
  }
  const start = index + marker.length + rel;
  const literal = extractBalanced(source, start);
  if (!literal) {
    return undefined;
  }
  try {
    return parseJsLiteral<T>(literal);
  } catch {
    return undefined;
  }
}
