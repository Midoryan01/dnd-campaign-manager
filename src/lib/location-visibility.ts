type VisibleLocation = { id: string; parentId: string | null; visibility: string };

export function filterVisibleLocations<T extends VisibleLocation>(locations: T[], isDm: boolean): T[] {
  if (isDm) return locations;
  const byId = new Map(locations.map(location => [location.id, location]));
  return locations.filter(location => {
    const seen = new Set<string>();
    let current: VisibleLocation | undefined = location;
    while (current) {
      if (seen.has(current.id) || !["PUBLIC", "PLAYER_VISIBLE"].includes(current.visibility)) return false;
      seen.add(current.id);
      if (!current.parentId) return true;
      current = byId.get(current.parentId);
    }
    return false;
  });
}
