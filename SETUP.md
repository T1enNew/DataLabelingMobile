# DataLabel App — Setup Guide

## ⚠️ IMPORTANT: This is a MOBILE-ONLY app
Run on Android/iOS device or emulator via Expo Go. Do NOT open in a browser.

---

## Step 1 — Install Dependencies

```bash
cd DataLabelingApp

# Delete node_modules if it exists from a previous install
rmdir /s /q node_modules   # Windows
# rm -rf node_modules      # Mac/Linux

# Install with legacy peer deps to avoid version conflicts
npm install --legacy-peer-deps
```

## Step 2 — Configure Backend URL

Open `src/services/api.js` and change:
```js
export const BASE_URL = 'http://192.168.1.100:5000';
```
Replace `192.168.1.100` with your computer's **local IP address**.

To find your IP:
- Windows: run `ipconfig` → look for "IPv4 Address"
- Mac/Linux: run `ifconfig` → look for `inet`

> Your phone and computer must be on the **same WiFi network**.

## Step 3 — Start the App (MOBILE ONLY)

```bash
# For Android device/emulator:
npx expo start --android

# For iOS device/simulator (Mac only):
npx expo start --ios

# For Expo Go app on your phone:
npx expo start
# Then scan the QR code with Expo Go
```

> ❌ Do NOT use `npm run web` — this causes the registerWebModule error

---

## Troubleshooting

### Error: `registerWebModule is not a function`
→ You opened the app in a browser. Use `npx expo start --android` or scan QR with Expo Go.

### Error: `Cannot find module 'expo-modules-core'`
```bash
npm install expo-modules-core@1.12.24 --legacy-peer-deps
```

### Error: dependency conflicts during install
```bash
npm install --legacy-peer-deps --force
```

### Clear all caches:
```bash
npx expo start --clear
```

---

## Default Login Credentials

| Role      | Email                      | Password      |
|-----------|----------------------------|---------------|
| Admin     | admin@example.com          | admin123      |
| Manager   | manager@example.com        | manager123    |
| Annotator | annotator1@example.com     | annotator123  |
| Reviewer  | reviewer1@example.com      | reviewer123   |

> Run `npm run seed` in the backend first to create these accounts.
