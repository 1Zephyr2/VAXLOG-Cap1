# Troubleshooting Guide

## If Expo Go Can't Connect

1. **Make sure your phone and computer are on the same WiFi network**

2. **Check the QR Code in the terminal** - It should display when you run `npm start`

3. **If the app crashes on startup**, check for these common issues:
   - Missing placeholder images: The app references image placeholders. Make sure `src/lib/placeholder-images.json` exists
   - Import errors: All imports use `@/` aliases which should now work with the babel and metro config

## Testing the App

### On iOS:
- Open the Camera app
- Point it at the QR code in the terminal
- Tap the notification to open in Expo Go

### On Android:
- Open the Expo Go app
- Tap "Scan QR Code"
- Point at the QR code in the terminal

## Common Commands

```bash
# Start the development server
npm start

# Start with cleared cache (if you have issues)
npx expo start --clear

# Open on specific platform
npm run android  # For Android
npm run ios      # For iOS
```

## What Was Fixed

✅ **Entry Point Issue**: Changed `package.json` main field from `expo-router/entry` to `node_modules/expo/AppEntry.js`
✅ **Conflicting Directories**: Renamed `src/app` (Next.js) to `src/_old_nextjs_app` to avoid Expo Router confusion
✅ **Dependencies**: Updated to Expo-compatible versions (react-native 0.76.9, @expo/vector-icons 14.0.4, etc.)
✅ **Security Vulnerabilities**: Ran `npm audit fix` - now 0 vulnerabilities!
✅ **Path Aliases**: Configured babel-plugin-module-resolver and metro config for `@/` imports
✅ **Cache**: Cleared bundler cache

## Current Status

The app should now load successfully in Expo Go! You'll see:
- Login screen as the initial screen
- After login, bottom tab navigation with Dashboard, Family, Vaccinations, and Calendar
- All screens are functional with React Native styling
