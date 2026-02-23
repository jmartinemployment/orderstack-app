# GAP-R02: Conversational AI Dashboard (Square AI Insights)

**Status:** NOT STARTED
**Priority:** 7
**Square Reference:** Natural language query interface — ask business questions, get charts/answers. Pinnable widget cards. Proactive alerts.

---

## Overview

Extend the existing ChatAssistant with a dashboard widget mode. Users ask questions in natural language ("What was my best selling item last Tuesday?"), receive structured data responses rendered as charts/tables/KPI cards, and can pin responses to the CommandCenter as persistent dashboard widgets. Proactive insight cards surface anomalies automatically.

---

## Phase 1 — AI Query → Widget Rendering (Steps 1-5)

### Step 1: Widget Models

**Files to modify:**
- `src/app/models/analytics.model.ts` — add `AiInsightCard` (id, query, responseType: 'chart' | 'table' | 'kpi' | 'text', title, data, chartType?, columns?, value?, unit?, trend?, createdAt). Add `PinnedWidget` (id, insightCardId, position, size: 'small' | 'medium' | 'large', pinnedAt, pinnedBy). Add `AiQueryResponse` (query, cards: AiInsightCard[], suggestedFollowUps: string[]).

### Step 2: Service Methods

**Files to modify:**
- `src/app/services/analytics.ts` — add `queryAi(question: string): Promise<AiQueryResponse>`, `pinWidget(card: AiInsightCard): Promise<PinnedWidget>`, `unpinWidget(widgetId: string): Promise<void>`, `loadPinnedWidgets(): Promise<PinnedWidget[]>`, `reorderPinnedWidgets(widgetIds: string[]): Promise<void>`. New signals: `_pinnedWidgets`, `_isQueryingAi`.

### Step 3: Chat Assistant Widget Mode

Extend ChatAssistant to render structured data responses as visual widgets instead of plain text.

**Files to modify:**
- `src/app/features/ai-chat/chat-assistant/chat-assistant.ts` — detect structured responses from AI, render as `AiInsightCard` components. Add "Pin to Dashboard" button on each card. Add suggested follow-up question chips below response.
- `src/app/features/ai-chat/chat-assistant/chat-assistant.html` — widget card templates: bar chart, line chart, pie chart, data table, KPI card, text summary. Pin button overlay.
- `src/app/features/ai-chat/chat-assistant/chat-assistant.scss` — widget card styles, chart containers, pin button.

### Step 4: Command Center Pinned Widgets

Add pinned widget section to CommandCenter.

**Files to modify:**
- `src/app/features/analytics/command-center/command-center.ts` — load pinned widgets on init. Render widget grid. Unpin action. Drag-to-reorder (optional).
- `src/app/features/analytics/command-center/command-center.html` — "My Insights" section with pinned widget grid above existing tabs.
- `src/app/features/analytics/command-center/command-center.scss` — widget grid layout, card sizes.

### Step 5: Chart Rendering

Render charts within widget cards using chart.js (already installed).

**Files to modify:**
- `src/app/features/ai-chat/chat-assistant/chat-assistant.ts` — chart rendering methods for bar, line, pie chart types using Chart.js canvas elements.

---

## Phase 2 — Proactive Insights (Steps 6-9)

### Step 6: Anomaly Detection

Reuse existing `SalesAlert` infrastructure to generate proactive insight cards.

**Files to modify:**
- `src/app/services/analytics.ts` — `loadProactiveInsights(): Promise<AiInsightCard[]>`. Generates cards from sales alerts, compliance alerts, and trend anomalies.

### Step 7: Insight Feed in Command Center

Display proactive insights as a scrollable feed.

**Files to modify:**
- `src/app/features/analytics/command-center/` — "Insights" feed section showing AI-generated observations. Dismiss/pin actions per card.

### Step 8: Quick Query Shortcuts

Predefined question buttons for common queries.

**Files to modify:**
- `src/app/features/ai-chat/chat-assistant/` — quick query chips: "Best seller this week", "Slowest day", "Labor cost trend", "Top customer", "Revenue vs last month".

### Step 9: Build Verification

- `ng build --configuration=production` — zero errors
