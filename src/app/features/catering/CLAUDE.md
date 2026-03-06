# Catering

## Purpose
Standalone catering event management module. Manages the full lifecycle
from inquiry through event completion with financial tracking.

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
CateringService — HttpClient-based, signal state, pipeline metrics

## Model
CateringJob — full financial model with packages, milestones, invoicing fields
Backward compat aliases: CateringEvent = CateringJob

## Sidebar visibility
Catering mode gets a completely different sidebar nav (buildCateringNav):
Administration, Jobs & Calendar, Invoices, Catering Menu, Clients, Reports, Staff/Scheduling, Marketing, Settings

## Status flow
inquiry → proposal_sent → contract_signed → deposit_received → in_progress → final_payment → completed
(cancelled from any state except completed)

## Phase 1 scope
Event management with financial field scaffolding. No actual invoicing, deposits, or proposals yet.
