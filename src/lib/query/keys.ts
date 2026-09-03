export const playerQueryKeys = {
  all: ["players"] as const,
  list: (search: string) => ["players", "list", search] as const,
};

export const catalogQueryKeys = {
  update: ["catalog", "update"] as const,
};
