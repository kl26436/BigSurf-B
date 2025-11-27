# 🏄 Big Surf Workout Tracker

A modern, client-side workout tracking web application with Firebase backend. Track your gym sessions, manage exercises, and monitor progress with an intuitive interface designed for mobile use.

![Version](https://img.shields.io/badge/version-2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌐 Live Demo

**[https://bigsurf.fit](https://bigsurf.fit)** - Try it now with your Google account!

## ✨ Features

- **🔐 Google Authentication** - Secure sign-in with Google accounts
- **💪 Real-time Workout Tracking** - Track sets, reps, and weights as you work out
- **📚 Exercise Library** - 79+ pre-loaded exercises with form videos
- **📋 Custom Exercises** - Create and manage your own exercises
- **📅 Workout History** - Calendar view with detailed workout logs
- **📊 Progress Tracking** - View exercise history and personal records
- **🎯 Template-Based Workouts** - Pre-built workout templates for different muscle groups
- **✏️ Manual Entry** - Add past workouts retroactively
- **🔄 Unit Toggle** - Switch between lbs/kg per exercise
- **⏱️ Rest Timers** - Automatic rest timer between sets
- **📱 Mobile-First Design** - Optimized for gym use on your phone
- **🌐 Offline Detection** - Graceful handling of network issues

## 🚀 Quick Start

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase account (for backend)
- Google account (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kl26436/BigSurf-B.git
   cd BigSurf-B
   ```

2. **Configure Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Google Authentication
   - Create a Firestore database
   - Copy your Firebase config to `js/core/firebase-config.js`

3. **Set up Firestore Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /exercises/{exerciseId} {
         allow read: if request.auth != null;
         allow write: if false;
       }
       match /workouts/{workoutId} {
         allow read: if request.auth != null;
         allow write: if false;
       }
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```

4. **Serve the app**
   ```bash
   # Using Python
   python -m http.server 8000

   # Or using Node.js
   npx serve

   # Or just open index.html in your browser
   ```

5. **Open in browser**
   ```
   http://localhost:8000
   ```

## 📁 Project Structure

```
BigSurf-B/
├── index.html                      # Main application page
├── style.css                       # Global styles
├── CLAUDE.md                       # Development guidelines for AI assistants
├── data/                           # Default data files
│   ├── exercises.json              # Default exercise database
│   └── workouts.json               # Default workout templates
├── docs/                           # Documentation
│   ├── DEPLOYMENT.md               # Firebase deployment guide
│   └── MOBILE_TESTING.md           # Mobile & PWA testing guide
├── js/
│   ├── main.js                     # Entry point & window exports
│   └── core/
│       ├── app-initialization.js   # App startup & auth
│       ├── app-state.js            # Global state management
│       ├── workout-core.js         # Workout session logic
│       ├── data-manager.js         # Firestore operations
│       ├── firebase-workout-manager.js # Advanced Firebase ops
│       ├── firebase-config.js      # Firebase SDK initialization
│       ├── exercise-library.js     # Exercise database management
│       ├── exercise-manager-ui.js  # Exercise library manager modal
│       ├── template-selection.js   # Workout template picker
│       ├── workout-history-ui.js   # History & calendar view
│       ├── manual-workout.js       # Manual workout entry
│       ├── ui-helpers.js           # Shared UI utilities
│       ├── error-handler.js        # Global error handling
│       ├── debug-utilities.js      # Debugging tools
│       └── workout/
│           └── workout-management-ui.js  # Template editor
└── legacy/                         # Deprecated files (not used in production)
    └── exercise-manager.html       # Old popup-based exercise manager
```

## 🎯 Usage

### Starting a Workout

1. Sign in with your Google account
2. Select a workout template from the home screen
3. Click "Start Workout"
4. Track your sets, reps, and weights in real-time
5. Complete the workout to save to history

### Adding Custom Exercises

1. Click the settings button
2. Navigate to "Manage Workouts"
3. Open the exercise library
4. Click "Add Exercise"
5. Fill in exercise details and save

### Viewing History

1. Click "Workout History" from the home screen
2. Browse calendar view or filter by date
3. Click any workout to view detailed stats
4. Options to repeat, resume, or delete workouts

### Manual Entry

1. Click "Add Manual Workout" from history
2. Select a template or create custom
3. Fill in date and exercise data
4. Submit to add to history

## 🔧 Configuration

### Firebase Setup

Edit `js/core/firebase-config.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};
```

### Default Unit

Edit `js/core/app-state.js` to change default weight unit:
```javascript
globalUnit: 'lbs'  // or 'kg'
```

## 📊 Data Model

### Firestore Collections

- **`users/{userId}/workouts/{date}`** - User workout sessions
- **`users/{userId}/templates/{templateId}`** - Custom workout templates
- **`users/{userId}/customExercises/{exerciseId}`** - User-created exercises
- **`users/{userId}/exerciseOverrides/{exerciseId}`** - Modified default exercises
- **`exercises/{exerciseId}`** - Global exercise library (read-only)
- **`workouts/{workoutId}`** - Global workout templates (read-only)

### Workout Document Structure

```javascript
{
  workoutType: "Chest – Push",
  date: "2025-01-24",
  startedAt: "2025-01-24T10:00:00.000Z",
  completedAt: "2025-01-24T11:30:00.000Z",
  totalDuration: 5400,
  exercises: {
    exercise_0: {
      sets: [
        { reps: 10, weight: 135, originalUnit: "lbs" },
        { reps: 8, weight: 145, originalUnit: "lbs" }
      ],
      notes: "Felt strong today",
      completed: true
    }
  },
  version: "2.0"
}
```

## 🛠️ Development

### Tech Stack

- **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5, CSS3
- **Backend**: Firebase (Firestore + Authentication)
- **No Build Process**: Direct ES6 module imports
- **CDN**: Firebase SDK 10.7.1, Font Awesome 6.0.0

### Code Style

- ES6+ features (arrow functions, async/await, destructuring)
- Modular architecture with clear separation of concerns
- Console logging with emoji prefixes for visual clarity
- Comprehensive error handling with user-friendly messages
- JSDoc-style comments for complex functions

### Adding New Features

1. Create module in `js/core/`
2. Export functions
3. Import in `js/main.js`
4. Assign to `window` object for HTML onclick handlers
5. Update CLAUDE.md with implementation details

### Debug Tools

Access via browser console:
```javascript
// Run all health checks
window.runAllDebugChecks()

// Check Firebase workout dates
window.debugFirebaseWorkoutDates()

// View app state
console.log(window.AppState)
```

## 🐛 Troubleshooting

### Common Issues

**"Permission Denied" errors**
- Check Firebase Security Rules
- Ensure you're signed in
- Verify user UID matches rules

**Exercises not loading**
- Check network connection
- Verify Firebase config
- Check browser console for errors

**Workouts not saving**
- Ensure date format is correct (YYYY-MM-DD)
- Check Firestore quotas
- Verify security rules allow writes

**Offline mode**
- App shows offline notification
- Changes sync when reconnected
- Some features require internet

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📧 Support

Found a bug? Have a feature request?
- Open an issue on GitHub
- Check existing issues first
- Provide detailed reproduction steps

## 🎉 Credits

- Exercise database curated from various fitness resources
- Form videos linked from YouTube fitness channels
- Built with ❤️ for gym enthusiasts

## 🗺️ Roadmap

- [ ] Progressive Web App (PWA) support
- [ ] Workout analytics and charts
- [ ] Social features (share workouts)
- [ ] Exercise form tips and cues
- [ ] Custom rest timer durations
- [ ] Export workout data
- [ ] Dark mode toggle
- [ ] Multi-language support

---

**Version 2.0** - Modern architecture with improved modularity and error handling
