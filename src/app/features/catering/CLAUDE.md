# Catering

## Purpose
Standalone catering event management module. Manages the full lifecycle
from inquiry through event completion.

## API Base
GET/POST /api/merchant/:id/catering/events
PATCH/DELETE /api/merchant/:id/catering/events/:eventId
GET/PUT /api/merchant/:id/catering/capacity

## Routes
- /app/catering — CateringDashboard (5 tabs)

## Components
- CateringDashboard (os-catering-dashboard)
- CateringEventCard (os-catering-event-card)
- CateringEventForm (os-catering-event-form)
- CateringCalendar (os-catering-calendar)

## Service
CateringService — HttpClient-based, signal state

## Sidebar visibility
platform.businessCategory() === 'Caterer' OR 'catering' in enabledModules

## Status flow
inquiry → proposal_sent → confirmed → completed (cancelled at any point)

## Phase 1 scope
Event management only. No orders, deposits, or invoicing yet.
