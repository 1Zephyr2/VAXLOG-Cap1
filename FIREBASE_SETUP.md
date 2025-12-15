# Firebase Setup Guide for VAXLOG

This guide will help you set up Firebase for the VAXLOG app. Follow these steps carefully.

## 🔥 Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `VAXLOG` (or your preferred name)
4. Click **Continue**
5. Disable Google Analytics (optional for Capstone 1)
6. Click **Create project**
7. Wait for setup to complete, then click **Continue**

## 📱 Step 2: Add a Web App to Your Project

1. In Firebase Console, click the **Web icon** (`</>`) to add a web app
2. Register app nickname: `VAXLOG Web`
3. **DO NOT** check "Also set up Firebase Hosting"
4. Click **Register app**
5. You'll see your Firebase configuration - **KEEP THIS PAGE OPEN**

## 🔑 Step 3: Get Your Firebase Configuration

You'll see something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "vaxlog-xxxxx.firebaseapp.com",
  projectId: "vaxlog-xxxxx",
  storageBucket: "vaxlog-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxx"
};
```

**Copy these values** - you'll need them in the next step.

## 📝 Step 4: Create Your .env File

1. In your project root directory, create a file named `.env`
2. Copy the contents from `.env.example`
3. Replace the placeholder values with your actual Firebase config values:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=vaxlog-xxxxx.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=vaxlog-xxxxx
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=vaxlog-xxxxx.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxxx
```

**Important:** 
- Make sure there are NO SPACES around the `=` sign
- Make sure there are NO QUOTES around the values
- Save the file as `.env` (not `.env.txt`)

## 🔐 Step 5: Enable Authentication

1. In Firebase Console, click **Authentication** in the left sidebar
2. Click **Get started**
3. Click on **Email/Password** under "Sign-in method"
4. Toggle **Enable** to ON
5. Click **Save**

## 💾 Step 6: Set Up Firestore Database

1. In Firebase Console, click **Firestore Database** in the left sidebar
2. Click **Create database**
3. Choose **Start in test mode** (we'll secure it later)
4. Click **Next**
5. Choose your location (closest to you): `us-central1` or your region
6. Click **Enable**
7. Wait for database to be created

### Set Up Firestore Rules (Security)

1. Once database is created, click on the **Rules** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to read all users (for staff to see patients)
    match /users/{userId} {
      allow read: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

## ✅ Step 7: Install Dependencies

In your terminal, run:

```bash
npm install
```

This will install the Firebase SDK that was already added to `package.json`.

## 🧪 Step 8: Test Your Setup

1. Start the Expo development server:
   ```bash
   npx expo start
   ```

2. Open the app in Expo Go

3. Try creating a new account:
   - Go to **Create Account** screen
   - Enter name, email, and password
   - Click **Create Account**
   - If successful, you'll see a success message!

4. Check Firebase Console:
   - Go to **Authentication** → **Users** tab
   - You should see your new user!
   - Go to **Firestore Database**
   - You should see a `users` collection with your user data!

## 👥 Step 9: Share Credentials with Your Team

**Option 1: Private Message** (Recommended)
- Send your `.env` file contents via Discord/Teams/WhatsApp
- Teammates copy-paste into their own `.env` file

**Option 2: Shared Document**
- Create a private Google Doc with the credentials
- Share link only with team members

**⚠️ NEVER commit the `.env` file to Git!** (It's already in `.gitignore`)

## 🆘 Troubleshooting

### "Firebase: Error (auth/network-request-failed)"
- Check your internet connection
- Make sure you're connected to WiFi or mobile data

### "Firebase: Error (auth/invalid-api-key)"
- Check that you copied the API key correctly from Firebase Console
- Make sure there are no extra spaces in your `.env` file
- Restart Expo server: `Ctrl+C` then `npx expo start`

### "Cannot find module '@/config/firebase'"
- Make sure the file `src/config/firebase.ts` exists
- Check that `babel.config.js` has the module-resolver plugin configured
- Restart Expo server

### Email already in use
- This email is already registered in Firebase
- Try logging in instead of creating a new account
- Or use a different email address

### Password too weak
- Firebase requires passwords to be at least 6 characters
- Use a stronger password

## 📚 What's Next?

Now that Firebase is set up, you can:
- ✅ Create accounts
- ✅ Login with email/password
- ✅ Accounts persist in Firebase
- ✅ All team members can see the same accounts

Next steps for your app:
- Add family members to Firestore
- Store vaccination records in Firestore
- Add appointments to Firestore
- Implement notifications

## 🎯 Quick Reference

**Firebase Console:** https://console.firebase.google.com/

**Your Project:** `https://console.firebase.google.com/project/YOUR-PROJECT-ID`

**Useful Firebase Docs:**
- [Authentication Docs](https://firebase.google.com/docs/auth)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [React Native Setup](https://firebase.google.com/docs/web/setup)

## ⚡ For Demo Day

Remember to:
1. Pre-create 2-3 demo accounts
2. Add sample data (family members, vaccines)
3. Test login/logout flow
4. Have mobile hotspot ready as backup
5. Keep app open in Expo Go (or build APK)

---

**Questions?** Ask your team lead or check the Firebase documentation!
