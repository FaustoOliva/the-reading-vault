# Debugging Guide - Mobile App Network Issues

## 🐛 Console Logs Reference

### What to Look For

The app now has extensive console logging to help you debug network issues. Here's what each log means and what to check:

---

## 🔧 Module Load Logs

**When:** App starts / module loads  
**Look for:** `🔧 API Configuration:`

```javascript
🔧 API Configuration: {
  EXPO_PUBLIC_API_URL: "http://192.168.1.6:3000",
  API_BASE_URL: "http://192.168.1.6:3000",
  allEnvVars: ["EXPO_PUBLIC_API_URL"]
}
```

**What to check:**
- ✅ `EXPO_PUBLIC_API_URL` should be your machine's IP (NOT `localhost`)
- ✅ `API_BASE_URL` should match `EXPO_PUBLIC_API_URL`
- ✅ `allEnvVars` should include `EXPO_PUBLIC_API_URL`

**Problems:**
- ❌ If `EXPO_PUBLIC_API_URL` is `undefined`: `.env` file not loaded or Expo not restarted
- ❌ If it shows `localhost`: Update `.env` to use your local IP
- ❌ If `allEnvVars` is empty: Expo didn't load environment variables

**Fix:**
1. Verify `.env` file exists in `packages/mobile/.env`
2. Restart Expo dev server: `npx expo start --clear`

---

## 🏠 Screen Render Logs

**When:** Screen renders  
**Look for:** `🏠 BooksListScreen render:`

```javascript
🏠 BooksListScreen render: {
  filters: {},
  page: 1
}
```

**What to check:**
- ✅ Filters and page values are correct
- ✅ Log appears when you open the Books tab

---

## 📚 Hook Execution Logs

**When:** React Query hook is called  
**Look for:** `📚 useBooks called with:`

```javascript
📚 useBooks called with: {
  filters: {},
  pagination: { page: 1, limit: 10 }
}
```

**What to check:**
- ✅ Hook is being called
- ✅ Pagination parameters are correct

---

## 🔄 Query Function Logs

**When:** React Query executes the data fetch  
**Look for:** `🔄 useBooks queryFn executing...`

```javascript
🔄 useBooks queryFn executing...
🎯 Endpoint: /api/books?page=1&limit=10
```

**What to check:**
- ✅ queryFn is executing (if not, React Query might be using cached data)
- ✅ Endpoint path looks correct

---

## 🌐 API Request Logs

**When:** fetch() is called  
**Look for:** `🌐 API Request:`

```javascript
🌐 API Request: {
  url: "http://192.168.1.6:3000/api/books?page=1&limit=10",
  method: "GET",
  baseUrl: "http://192.168.1.6:3000",
  endpoint: "/api/books?page=1&limit=10"
}
```

**What to check:**
- ✅ `url` is complete and correct
- ✅ `baseUrl` matches your machine's IP
- ✅ `endpoint` includes the query parameters

**Problems:**
- ❌ `url` shows `localhost`: `.env` not loaded correctly
- ❌ Port is wrong: Check if backend is running on port 3000
- ❌ This log doesn't appear: Hook might not be executing

---

## ✅ API Response Logs

**When:** fetch() completes successfully  
**Look for:** `✅ API Response:`

```javascript
✅ API Response: {
  url: "http://192.168.1.6:3000/api/books?page=1&limit=10",
  status: 200,
  ok: true
}
```

**What to check:**
- ✅ `status: 200` means success
- ✅ `ok: true` means no HTTP error

**Problems:**
- ❌ This log doesn't appear: Network error, request never reached server
- ❌ `status: 404`: Route not found on backend
- ❌ `status: 500`: Backend error

---

## 📦 API Data Logs

**When:** Response data is parsed  
**Look for:** `📦 API Data:`

```javascript
📦 API Data: {
  url: "http://192.168.1.6:3000/api/books?page=1&limit=10",
  dataKeys: ["success", "data", "pagination"]
}
```

**What to check:**
- ✅ `dataKeys` includes expected fields (`success`, `data`, `pagination`)

---

## ✨ Query Success Logs

**When:** React Query receives successful data  
**Look for:** `✨ useBooks response:`

```javascript
✨ useBooks response: {
  booksCount: 5,
  pagination: { page: 1, limit: 10, total: 5, totalPages: 1 }
}
```

**What to check:**
- ✅ `booksCount` shows number of books returned
- ✅ `pagination` object looks correct

---

## ❌ API Error Logs

**When:** HTTP error (4xx, 5xx)  
**Look for:** `❌ API Error Response:`

```javascript
❌ API Error Response: {
  url: "http://192.168.1.6:3000/api/books",
  status: 404,
  error: { message: "Not Found" }
}
```

**What to check:**
- Status codes:
  - `400`: Bad request (validation error)
  - `404`: Route not found
  - `500`: Backend server error
  - `CORS error`: CORS policy blocking request

**Fix:**
- Check backend logs for more details
- Verify route exists in backend: `GET /api/books`

---

## 💥 Network Error Logs

**When:** Request fails completely (can't reach server)  
**Look for:** `💥 API Request Failed:`

```javascript
💥 API Request Failed: {
  url: "http://192.168.1.6:3000/api/books?page=1&limit=10",
  error: "Network request failed",
  type: "TypeError"
}
```

**Common errors:**
1. **"Network request failed"**
   - Backend not running
   - Wrong IP address
   - Firewall blocking connection
   - Not on same WiFi network

2. **"Failed to fetch"**
   - Same as above
   - CORS issue (unlikely with current setup)

3. **Timeout**
   - Server is slow or hanging
   - Network connectivity issue

**Fix:**
1. Verify backend is running: `npm start` in `packages/api`
2. Test endpoint in browser: `http://192.168.1.6:3000/api/health`
3. Check if phone/emulator is on same WiFi network
4. Verify IP address is correct: run `ipconfig`

---

## 📊 Query State Logs

**When:** Component re-renders  
**Look for:** `📊 Query state:`

```javascript
📊 Query state: {
  isLoading: false,
  isRefetching: false,
  hasError: false,
  errorMessage: undefined,
  hasData: true,
  booksCount: 5
}
```

**What to check:**
- ✅ `isLoading: true` → First load
- ✅ `isRefetching: true` → Pull-to-refresh or refetch
- ✅ `hasError: false` → No errors
- ✅ `hasData: true` → Data received successfully
- ✅ `booksCount` → Number of books in response

**Problem states:**
- ❌ `hasError: true` → Check `errorMessage`
- ❌ `hasData: false` after loading → Request failed
- ⚠️ `isLoading: true` forever → Request hanging

---

## 🐛 On-Screen Debug Panel

The app shows a yellow debug panel at the top with:
- Current API URL
- Full endpoint being called
- Request status (Loading/Error/Success)
- Error message if any

**This helps verify:**
- The app is using the correct IP address
- The endpoint format is correct
- Whether errors are happening

**To remove:** Delete the `<DebugInfo />` components after debugging

---

## 🔍 Quick Debugging Checklist

Use this sequence when debugging:

1. **Check Module Load:**
   ```
   ✅ See "🔧 API Configuration" with correct IP?
   ```

2. **Check Hook Execution:**
   ```
   ✅ See "📚 useBooks called with"?
   ```

3. **Check Network Request:**
   ```
   ✅ See "🌐 API Request" with full URL?
   ```

4. **Check for Response or Error:**
   ```
   ✅ See "✅ API Response" OR "💥 API Request Failed"?
   ```

5. **If Error, check type:**
   ```
   - "Network request failed" → Backend not reachable
   - HTTP status code → Backend error
   ```

---

## 📱 How to View Console Logs

### iOS Simulator
```bash
# Run in terminal:
npx react-native log-ios
```

### Android Emulator
```bash
# Run in terminal:
npx react-native log-android
```

### Expo Go (Physical Device)
- Shake device → Open dev menu → "Debug Remote JS"
- Or press `j` in Expo terminal
- Logs appear in browser console (Chrome DevTools)

### VS Code Terminal
- Logs automatically appear in the terminal running Expo

---

## 🎯 Most Common Issues & Solutions

### 1. "Network request failed" immediately

**Root cause:** Can't connect to backend

**Debug logs to check:**
```
🔧 API Configuration: { EXPO_PUBLIC_API_URL: "???" }
🌐 API Request: { url: "???" }
💥 API Request Failed: { error: "Network request failed" }
```

**Fix:**
1. Check `.env` has correct IP (not localhost)
2. Backend is running: `npm start` in packages/api
3. Test in browser: `http://YOUR_IP:3000/api/health`
4. Phone/emulator on same WiFi

### 2. Logs stop at "🌐 API Request"

**Root cause:** Request sent but no response

**Fix:**
- Backend probably crashed or hanging
- Check backend terminal for errors
- Restart backend

### 3. "❌ API Error Response: status 404"

**Root cause:** Route doesn't exist

**Fix:**
- Verify backend route: `GET /api/books`
- Check backend logs for routing errors

### 4. Environment variable is undefined

**Debug log:**
```
🔧 API Configuration: { EXPO_PUBLIC_API_URL: undefined }
```

**Fix:**
1. Create `.env` file in `packages/mobile/`
2. Add: `EXPO_PUBLIC_API_URL=http://YOUR_IP:3000`
3. **Restart Expo dev server** (required!)

---

## 💡 Pro Tips

1. **After changing `.env`:** Always restart with `npx expo start --clear`
2. **Use browser first:** Test `http://YOUR_IP:3000/api/books` in browser before debugging mobile
3. **Check both consoles:** Backend logs + Mobile logs together give full picture
4. **Network tab:** Use Chrome DevTools Network tab when debugging remote JS

---

## 🆘 Still Having Issues?

Share these logs:
1. `🔧 API Configuration` log
2. `🌐 API Request` log
3. `💥 API Request Failed` log (if present)
4. Backend console output
5. Result of browser test: `http://YOUR_IP:3000/api/health`
