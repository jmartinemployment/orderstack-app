# Bar

## Purpose
Dedicated bar terminal — full-screen POS optimized for bartenders with quick-pour items and tab management.

## Route
`/bar` — Full-screen (no sidebar), requires auth + onboarding + device init

## Components
- **BarTerminal** (`os-bar-terminal`) — Bar-optimized POS with quick-pour buttons, tab management, and drink queue

## Services
- Uses same services as POS: `OrderService`, `CartService`, `PaymentService`, `MenuService`
- `DeviceService` — Device mode detection

## Key Patterns
- Full-screen route (no `MainLayoutComponent`)
- Uses `deviceInitResolver` to initialize device context
- Optimized for speed: large touch targets, drink categories, tab open/close
