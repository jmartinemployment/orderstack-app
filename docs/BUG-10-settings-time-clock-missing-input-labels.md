# BUG-10: Settings Time Clock Tab -- 6 Inputs Missing Labels

## Summary

The Time Clock settings tab has 6 form elements (selects, time inputs, and
number inputs) in the Workweek Configuration, Schedule Enforcement, and Auto
Clock-Out sections that lack `id`+`for` label associations. Screen readers
cannot identify these fields.

## Severity

Medium -- accessibility violation (WCAG 2.1 Level A, criterion 1.3.1)

## Steps to Reproduce

1. Log in as owner@taipa.com / owner123
2. Navigate to Settings > Time Clock tab
3. Enable Schedule Enforcement toggle (if not already on) to reveal 2 more inputs
4. Inspect the form inputs in Workweek Configuration, Schedule Enforcement,
   and Auto Clock-Out sections

## Expected

Every input has a programmatic label.

## Actual

6 inputs have `<label class="form-label">` elements but no `for` attribute,
and the inputs have no `id` or `aria-label`:

1. **Week Starts On** select (line 59)
2. **Day Starts At** time input (line 67)
3. **Overtime After (hours/week)** number input (line 71)
4. **Early clock-in grace (minutes)** number input (line 99)
5. **Late clock-in threshold (minutes)** number input (line 104)
6. **Auto clock-out mode** select (line 121)

## Root Cause

File: `src/app/features/settings/break-config/break-config.html`

### Workweek Configuration (lines 58-72)

```html
<label class="form-label">Week Starts On</label>
<select class="form-select" [value]="wwStartDay()" (change)="setWwStartDay(+$any($event.target).value)">

<label class="form-label">Day Starts At</label>
<input type="time" class="form-control" [value]="wwStartTime()" (input)="setWwStartTime($any($event.target).value)">

<label class="form-label">Overtime After (hours/week)</label>
<input type="number" class="form-control" [value]="wwOtThreshold()" ...>
```

### Schedule Enforcement (lines 98-104)

```html
<label class="form-label">Early clock-in grace (minutes)</label>
<input type="number" class="form-control" [value]="tcEarlyGraceMinutes()" ...>

<label class="form-label">Late clock-in threshold (minutes)</label>
<input type="number" class="form-control" [value]="tcLateThresholdMinutes()" ...>
```

### Auto Clock-Out (line 121)

```html
<label class="form-label">Auto clock-out mode</label>
<select class="form-select" [value]="tcAutoClockOutMode()" ...>
```

No `id` on any input, no `for` on any label.

## Fix

Add `id` and `for` attributes to all 6 input/label pairs:

```html
<!-- Workweek Configuration -->
<label for="wwStartDay" class="form-label">Week Starts On</label>
<select id="wwStartDay" class="form-select" [value]="wwStartDay()" ...>

<label for="wwStartTime" class="form-label">Day Starts At</label>
<input id="wwStartTime" type="time" class="form-control" [value]="wwStartTime()" ...>

<label for="wwOtThreshold" class="form-label">Overtime After (hours/week)</label>
<input id="wwOtThreshold" type="number" class="form-control" [value]="wwOtThreshold()" ...>

<!-- Schedule Enforcement -->
<label for="tcEarlyGrace" class="form-label">Early clock-in grace (minutes)</label>
<input id="tcEarlyGrace" type="number" class="form-control" [value]="tcEarlyGraceMinutes()" ...>

<label for="tcLateThreshold" class="form-label">Late clock-in threshold (minutes)</label>
<input id="tcLateThreshold" type="number" class="form-control" [value]="tcLateThresholdMinutes()" ...>

<!-- Auto Clock-Out -->
<label for="tcAutoClockOutMode" class="form-label">Auto clock-out mode</label>
<select id="tcAutoClockOutMode" class="form-select" [value]="tcAutoClockOutMode()" ...>
```

Also add labels for the 2 conditionally visible inputs (lines 131, 138):

```html
<label for="tcAutoClockOutDelay" class="form-label">Delay after shift end (minutes)</label>
<input id="tcAutoClockOutDelay" type="number" class="form-control" ...>

<label for="tcBusinessDayCutoff" class="form-label">Business day cutoff time</label>
<input id="tcBusinessDayCutoff" type="time" class="form-control" ...>
```

## Files to Change

- `src/app/features/settings/break-config/break-config.html` (lines 58-72, 98-104, 120-138)

## Verification

Run the Playwright settings audit. Time Clock tab should report 0 inputs
without label/placeholder.
