# Mobile App - Network Configuration Guide

## Problem: Network Error / API Not Reachable

### Root Cause

When using Expo on a physical device or emulator, `localhost` refers to the **device itself**, not your development machine. The API running on your computer is not accessible via `localhost` from the device.

### Solution: Use Your Machine's Local IP

#### Step 1: Find Your Local IP Address

**Windows:**

```powershell
ipconfig | Select-String 'IPv4'
```

Look for the WiFi or Ethernet adapter (not VirtualBox/Docker adapters).

**Mac/Linux:**

```bash
ifconfig | grep inet
# or
ipconfig getifaddr en0  # WiFi
```

**Example output:**

```
WiFi Adapter:
  IPv4 Address: 192.168.1.6
```

#### Step 2: Update `.env` File

Edit `packages/mobile/.env`:

```bash
# ❌ WRONG - doesn't work on devices
EXPO_PUBLIC_API_URL=http://localhost:3000

# ✅ CORRECT - use your machine's IP
EXPO_PUBLIC_API_URL=http://192.168.1.6:3000
```

**Your current IP:** `192.168.1.6`

#### Step 3: Restart Expo

After changing `.env`, you **must restart** the Expo dev server:

```bash
# Press Ctrl+C to stop
# Then restart
npx expo start
```

Or use:

```bash
npx expo start --clear  # Clears cache
```

#### Step 4: Verify Backend is Running

Ensure the API is running on port 3000:

```bash
cd packages/api
npm start
```

You should see:

```
Server running on port 3000
```

#### Step 5: Test Connection

Open your browser and navigate to:

```
http://192.168.1.6:3000/api/health
```

You should see:

```json
{
  "success": true,
  "data": {
    "message": "API is running",
    "timestamp": "..."
  }
}
```

### Troubleshooting

#### Still getting network errors?

1. **Check firewall:**
   - Windows: Allow Node.js through Windows Firewall
   - Mac: System Preferences → Security & Privacy → Firewall

2. **Verify same network:**
   - Ensure your phone/emulator and development machine are on the **same WiFi network**

3. **Check CORS configuration:**
   - Backend already has CORS enabled for all origins (development mode)

4. **Try tunnel mode (slower but works always):**
   ```bash
   npx expo start --tunnel
   ```

#### IP Address Changes?

If you switch WiFi networks or your router assigns a new IP:

1. Re-run `ipconfig` to get new IP
2. Update `.env` file
3. Restart Expo

### Quick Reference

| Scenario                   | Use                                    |
| -------------------------- | -------------------------------------- |
| Web browser (localhost)    | `http://localhost:3000`                |
| Expo Go on physical device | `http://[YOUR_LOCAL_IP]:3000`          |
| iOS Simulator              | `http://localhost:3000` (works)        |
| Android Emulator           | `http://10.0.2.2:3000` or use local IP |
| Expo tunnel mode           | No IP needed (uses ngrok)              |

### Current Configuration

- **Backend URL:** `http://192.168.1.6:3000`
- **API Prefix:** `/api`
- **Example endpoint:** `http://192.168.1.6:3000/api/books`

### Verification Checklist

- [ ] Found local IP address
- [ ] Updated `.env` file
- [ ] Restarted Expo dev server
- [ ] Backend is running on port 3000
- [ ] Tested `/api/health` endpoint in browser
- [ ] Device/emulator is on same WiFi network
