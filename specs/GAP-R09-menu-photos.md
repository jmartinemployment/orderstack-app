# GAP-R09: Menu Item Photos with AI Description Generation

**Status:** Phase 1 COMPLETE
**Priority:** 8
**Square Reference:** Photo upload for items. AI-generated descriptions. Photos on kiosk, online ordering, POS.

---

## Overview

Upload photos for menu items stored in Supabase Storage. AI generates appetizing descriptions from photos via Claude API. Photos display on kiosk item cards, online ordering, and optionally as thumbnails in POS item grid.

---

## Phase 1 — Image Upload & Display (Steps 1-5)

### Step 1: Model Update

**Files to modify:**
- `src/app/models/menu.model.ts` — add `imageUrl: string | null`, `thumbnailUrl: string | null`, `aiGeneratedDescription: string | null` to `MenuItem`.

### Step 2: Image Upload Service

**Files to modify:**
- `src/app/services/menu.ts` — add `uploadItemImage(itemId: string, file: File): Promise<{imageUrl: string, thumbnailUrl: string}>` (uploads to Supabase Storage, generates thumbnail). `deleteItemImage(itemId: string): Promise<void>`. `generateItemDescription(itemId: string): Promise<string>` (sends image to backend → Claude API → returns appetizing description).

### Step 3: Item Management Image Upload

**Files to modify:**
- `src/app/features/menu-mgmt/item-management/item-management.ts` — add image upload zone in item editor. Preview display. Delete image button. "Generate Description with AI" button.
- `src/app/features/menu-mgmt/item-management/item-management.html` — image upload dropzone with preview, file size limit display (2MB), accepted formats (jpg, png, webp). AI description generation button with loading spinner. Generated description textarea (editable).
- `src/app/features/menu-mgmt/item-management/item-management.scss` — image upload zone styles, preview thumbnail.

### Step 4: Online Ordering Image Display

**Files to modify:**
- `src/app/features/online-ordering/online-order-portal/` — show item images in menu grid cards. Lazy loading with placeholder. Image lightbox on tap.

### Step 5: Build Verification

- `ng build --configuration=production` — zero errors

---

## Phase 2 — Extended Display & AI (Steps 6-9)

### Step 6: Kiosk Image Display

Menu item cards on kiosk/SOS terminal show images prominently.

### Step 7: POS Thumbnail Option

Optional thumbnail display in POS item grid (toggle in settings — some restaurants prefer text-only for speed).

### Step 8: Bulk AI Description Generation

"Generate All Descriptions" batch action for items with images but no description.

### Step 9: Image Optimization

Auto-resize and compress uploaded images. Generate WebP format. CDN caching headers.
