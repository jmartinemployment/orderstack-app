# Device Pairing Guide

## Overview

OrderStack uses a code-based pairing system to securely connect new devices (phones, tablets, KDS screens) to a restaurant. A manager generates a short-lived code, and the new device enters it to pair.

## How to Generate a Pairing Code

1. Sign in as a manager or owner
2. Navigate to **Settings > Hardware**
3. Click **Generate Device Code**
4. Choose the device type (POS Terminal, KDS Station, Kiosk, Order Pad)
5. A 5-character alphanumeric code is displayed — valid for **15 minutes**
6. Share the code with the person setting up the new device

## How to Pair a Device

1. On the new device, open the browser and navigate to `app.com/pair`
2. Enter the 5-character pairing code (case-insensitive, auto-uppercased)
3. Click **Pair Device**
4. On success, the device is registered and you are redirected to the **Sign In** page
5. Sign in with your staff credentials — the app detects the paired device and routes to the appropriate screen

## What Happens After Pairing

- The device ID is stored in the browser's localStorage
- On login, the app reads the device's assigned type and routes accordingly

### Device Type to Route Mapping

| Device Type | Route | Screen |
|-------------|-------|--------|
| `pos_terminal` | `/pos` | Server POS Terminal |
| `kds_station` | `/kds` | Kitchen Display System |
| `kiosk` | `/kiosk` | Self-Service Kiosk |
| `order_pad` | `/order-pad` | Handheld Order Pad |

## Code Expiry

Pairing codes expire **15 minutes** after generation. If a code expires:

1. Return to **Settings > Hardware**
2. Generate a new code
3. Re-enter it on the device

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Invalid or expired pairing code" | The code has expired or was typed incorrectly. Generate a new code in Settings > Hardware. |
| Device paired but wrong screen loads | Check the device type assigned during code generation in Settings > Hardware. Update the device's type if needed. |
| Device was already paired | If the browser still has a `device_id` in localStorage, it is already paired. Navigate to `/login` to sign in. |
| Need to unpair a device | Go to Settings > Hardware, find the device in the active devices list, and revoke it. On the device, clear browser data or localStorage. |
