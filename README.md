# VAXLOG - Vaccination Tracking App

A React Native mobile application for tracking family vaccinations, managing appointments, and receiving vaccination reminders.

## 🚀 Features

- **User Authentication**: Secure account creation and login with Firebase
- **Family Management**: Add and manage family members
- **Vaccination Tracking**: Record and track vaccination history
- **Appointment Scheduling**: Manage vaccination appointments
- **Role-Based Access**: Separate views for patients and healthcare staff
- **Notifications**: Reminders for upcoming vaccinations

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo Go app on your mobile device
- Firebase account (free)

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/1Zephyr2/VAXLOG-Cap1.git
cd VAXLOG-Cap1
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Firebase

Follow the detailed instructions in [FIREBASE_SETUP.md](FIREBASE_SETUP.md) to:
- Create a Firebase project
- Enable Authentication
- Set up Firestore Database
- Get your Firebase credentials

### 4. Configure Environment Variables

1. Copy `.env.example` to create `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Firebase credentials to `.env`:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here
   ```

### 5. Start the Development Server

```bash
npx expo start
```

### 6. Run on Your Device

- Scan the QR code with Expo Go (Android) or Camera app (iOS)
- The app will load on your device

## 👥 For Team Members

1. Pull the latest code: `git pull`
2. Install dependencies: `npm install`
3. Get Firebase credentials from team lead
4. Create your `.env` file with the shared credentials
5. Run: `npx expo start`

**Note:** The `.env` file is not committed to Git for security. Each team member needs to create their own `.env` file locally.

## 🏗️ Project Structure

```
VAXLOG-Cap1/
├── src/
│   ├── components/       # Reusable components
│   ├── config/          # Configuration files (Firebase)
│   ├── context/         # React Context providers
│   ├── lib/             # Utility functions and data
│   └── screens/         # Screen components
│       ├── app/         # Main app screens
│       ├── auth/        # Authentication screens
│       └── staff/       # Staff-specific screens
├── android/             # Android native files
├── .env.example         # Environment variables template
├── FIREBASE_SETUP.md    # Detailed Firebase setup guide
└── README.md           # This file
```

## 🧪 Testing

### Create a Test Account

1. Open the app
2. Tap "Create Account"
3. Enter name, email, and password
4. Account will be created in Firebase

### Login

1. Open the app
2. Select role (Patient or Staff)
3. Enter credentials
4. Tap "Log In"

## 📱 Building for Production

### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build --platform android --profile preview
```

The APK will be available for download after the build completes (~15-20 minutes).

## 🔒 Security

- Firebase Authentication handles password hashing and security
- Firestore rules restrict data access to authenticated users
- Environment variables are not committed to Git
- Passwords must be at least 6 characters

## 🐛 Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

For Firebase-specific issues, see [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

## 📚 Technologies Used

- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **Firebase Authentication** - User authentication
- **Firestore** - Cloud database
- **React Navigation** - Navigation
- **React Context** - State management

## 👨‍💻 Development Team

Capstone 1 Project - Team VAXLOG

## 📄 License

This project is for educational purposes (Capstone 1).

## 🤝 Contributing

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Create a Pull Request

## 📞 Support

For questions or issues, contact your team lead or create an issue in the repository.