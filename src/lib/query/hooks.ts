"use client";

import { useQuery } from "@tanstack/react-query";
import { playerListResultSchema } from "@/lib/domain/query";
import { playerQueryKeys } from "@/lib/query/keys";

export function usePlayerList(search: string) {
  return useQuery({
    queryKey: playerQueryKeys.list(search),
    queryFn: async () => {
      const response = await fetch(`/api/players${search ? `?${search}` : ""}`);
      if (!response.ok) {
        throw new Error("Failed to load players");
      }
      return playerListResultSchema.parse(await response.json());
    },
    placeholderData: (previous) => previous,
  });
}
