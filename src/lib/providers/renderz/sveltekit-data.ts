function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hydratePacked(values: unknown[]): unknown {
  const hydrate = (index: number): unknown => {
    if (!Number.isInteger(index) || index < 0) {
      return undefined;
    }
    return revive(values[index]);
  };

  const revive = (value: unknown): unknown => {
    if (value === null || typeof value !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => (typeof item === "number" ? hydrate(item) : revive(item)));
    }
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = typeof item === "number" ? hydrate(item) : revive(item);
    }
    return out;
  };

  return hydrate(0);
}

export function inflateSvelteKitData(raw: unknown): Record<string, unknown>[] {
  if (!isRecord(raw) || !Array.isArray(raw.nodes)) {
    return [];
  }
  const inflated: Record<string, unknown>[] = [];
  for (const node of raw.nodes) {
    if (!isRecord(node) || !Array.isArray(node.data)) {
      continue;
    }
    const value = hydratePacked(node.data);
    if (isRecord(value)) {
      inflated.push(value);
    }
  }
  return inflated;
}

export function findInflatedField<T>(
  nodes: Record<string, unknown>[],
  key: string,
): T | undefined {
  for (const node of nodes) {
    if (key in node) {
      return node[key] as T;
    }
  }
  return undefined;
}
