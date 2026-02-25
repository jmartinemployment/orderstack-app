import { describe, it, expect } from 'vitest';

// --- Interfaces ---

interface LocationGroup {
  id: string;
  name: string;
}

interface LocationGroupMember {
  id: string;
  restaurantId: string;
}

interface CrossLocationInventoryItem {
  id: string;
  name: string;
  isLowStockAnywhere: boolean;
}

interface LocationHealth {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
}

// --- Pure function replicas ---

function groupCount(groups: LocationGroup[]): number {
  return groups.length;
}

function lowStockItems(items: CrossLocationInventoryItem[]): CrossLocationInventoryItem[] {
  return items.filter(item => item.isLowStockAnywhere);
}

function offlineLocations(locations: LocationHealth[]): LocationHealth[] {
  return locations.filter(loc => loc.status !== 'online');
}

// List mutations
function addGroup(groups: LocationGroup[], group: LocationGroup): LocationGroup[] {
  return [...groups, group];
}

function updateGroupInList(groups: LocationGroup[], id: string, updated: LocationGroup): LocationGroup[] {
  return groups.map(g => g.id === id ? updated : g);
}

function deleteGroupFromList(groups: LocationGroup[], id: string): LocationGroup[] {
  return groups.filter(g => g.id !== id);
}

function addMember(members: LocationGroupMember[], member: LocationGroupMember): LocationGroupMember[] {
  return [...members, member];
}

function removeMember(members: LocationGroupMember[], memberId: string): LocationGroupMember[] {
  return members.filter(m => m.id !== memberId);
}

// --- Tests ---

describe('MultiLocationService — computed signals', () => {
  it('groupCount returns length', () => {
    expect(groupCount([{ id: 'g-1', name: 'A' }, { id: 'g-2', name: 'B' }])).toBe(2);
  });

  it('groupCount returns 0 for empty', () => {
    expect(groupCount([])).toBe(0);
  });

  it('lowStockItems filters low stock', () => {
    const items: CrossLocationInventoryItem[] = [
      { id: 'i-1', name: 'Item A', isLowStockAnywhere: true },
      { id: 'i-2', name: 'Item B', isLowStockAnywhere: false },
      { id: 'i-3', name: 'Item C', isLowStockAnywhere: true },
    ];
    expect(lowStockItems(items)).toHaveLength(2);
  });

  it('offlineLocations filters non-online', () => {
    const locations: LocationHealth[] = [
      { id: 'l-1', name: 'Downtown', status: 'online' },
      { id: 'l-2', name: 'Airport', status: 'offline' },
      { id: 'l-3', name: 'Mall', status: 'degraded' },
    ];
    expect(offlineLocations(locations)).toHaveLength(2);
  });
});

describe('MultiLocationService — group mutations', () => {
  const groups: LocationGroup[] = [{ id: 'g-1', name: 'Florida' }];

  it('addGroup appends', () => {
    expect(addGroup(groups, { id: 'g-2', name: 'Texas' })).toHaveLength(2);
  });

  it('updateGroupInList replaces matching', () => {
    const result = updateGroupInList(groups, 'g-1', { id: 'g-1', name: 'Updated' });
    expect(result[0].name).toBe('Updated');
  });

  it('deleteGroupFromList removes matching', () => {
    expect(deleteGroupFromList(groups, 'g-1')).toHaveLength(0);
  });
});

describe('MultiLocationService — member mutations', () => {
  const members: LocationGroupMember[] = [{ id: 'm-1', restaurantId: 'r-1' }];

  it('addMember appends', () => {
    expect(addMember(members, { id: 'm-2', restaurantId: 'r-2' })).toHaveLength(2);
  });

  it('removeMember removes matching', () => {
    expect(removeMember(members, 'm-1')).toHaveLength(0);
  });
});
