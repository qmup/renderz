import { programEventLabel } from '@/lib/catalog/programs';
import type { PlayerListQuery } from '@/lib/domain/query';

export const PLAYER_SORT_OPTIONS: Array<{
  value: PlayerListQuery['sort'];
  label: string;
}> = [
  { value: 'added_desc', label: 'Newest added' },
  { value: 'rating_desc', label: 'Rating (high)' },
  { value: 'rating_asc', label: 'Rating (low)' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
  { value: 'fetched_desc', label: 'Recently fetched' },
];

export function formatProgramFacetLabel(programId: string): string {
  return programEventLabel(programId);
}

export function toggleListValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

/** RenderZ-style position chips (3-column grids; MIDFIELD last cell empty). */
export const POSITION_GROUPS: Array<{ label: string; positions: string[] }> = [
  { label: 'ATTACK', positions: ['RW', 'CF', 'ST', 'LW'] },
  { label: 'MIDFIELD', positions: ['RM', 'CM', 'CDM', 'CAM', 'LM'] },
  { label: 'DEFENCE', positions: ['GK', 'RWB', 'RB', 'CB', 'LB', 'LWB'] },
];

const KNOWN_POSITIONS = new Set(
  POSITION_GROUPS.flatMap((group) => group.positions),
);

export function positionFilterGroups(
  extraValues: string[] = [],
): Array<{ label: string; positions: string[] }> {
  const extras = [
    ...new Set(extraValues.filter((value) => !KNOWN_POSITIONS.has(value))),
  ].sort((a, b) => a.localeCompare(b));
  if (extras.length === 0) {
    return POSITION_GROUPS;
  }
  return [...POSITION_GROUPS, { label: 'OTHER', positions: extras }];
}
