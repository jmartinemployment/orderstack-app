# TODO: Staff / Team Member Data Unification

## Problem

Two separate staff views exist with disconnected data sources:

1. **Dashboard > Staff** (`/scheduling`) — shows 8 staff members (Ana, Carlos, Diego, etc.) from hardcoded/mock data in the scheduling component
2. **Settings > Staff > Team Members** (`/settings`, Staff tab) — real CRUD backed by `GET /restaurant/{id}/team-members` — shows "No team members yet" because the scheduling page never writes to the database

## Expected Behavior

A single source of truth for team members. Creating a team member in Settings should make them appear in the scheduling grid, and vice versa. Square handles this with one unified **Team** section.

## What Needs to Happen

1. Remove hardcoded staff from `staff-scheduling.ts` — replace with real `TeamMember` records from the database
2. The scheduling page should call `StaffManagementService.loadTeamMembers()` for its staff list
3. Consider moving Team Member CRUD out of Settings and into the main Staff/Scheduling page (or at minimum, link between them)
4. The "Add Member" flow in Settings > Staff should be accessible from the scheduling page too

## Related: Device ↔ Team Member Relationship

- `Device` and `TeamMember` have no foreign key relationship today (both link to Restaurant independently)
- Need to add `teamMemberId` on `Device` so paired devices can be assigned to team members
- After pairing (`/pair`), the flow is: enter code → enter PIN → set email/password → redirect to device type screen

## Files Involved

- `src/app/features/labor/staff-scheduling/staff-scheduling.ts` — has mock staff data
- `src/app/features/settings/staff-management/staff-management.ts` — real CRUD
- `src/app/services/staff-management.ts` — service with loadTeamMembers()
- Backend: `Get-Order-Stack-Restaurant-Backend/src/app/team-management.routes.ts`
- Backend schema: `prisma/schema.prisma` — `TeamMember` and `Device` models

## Priority

Fix after device pairing flow is complete.
