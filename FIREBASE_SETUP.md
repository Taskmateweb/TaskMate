# Firebase Setup Guide for TaskMate

## 📋 Prerequisites
- A Google account
- Your TaskMate project files

## 🔥 Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select an existing project
3. Enter project name: **"TaskMate"** (or your preferred name)
4. Disable Google Analytics (optional for this project)
5. Click **"Create project"**
6. Wait for project creation to complete

## 🔐 Step 2: Enable Authentication

1. In your Firebase Console, click **"Authentication"** from the left sidebar
2. Click **"Get started"**
3. Go to the **"Sign-in method"** tab
4. Click on **"Email/Password"**
5. Toggle **"Enable"** to ON
6. Click **"Save"**

## 🗄️ Step 3: Create Firestore Database

1. Click **"Firestore Database"** from the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"**
4. Select a Cloud Firestore location (choose closest to your users)
5. Click **"Enable"**

### Set up Firestore Rules

Once the database is created, go to the **"Rules"** tab and replace the content with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tasks collection
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && 
                          request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    
    // Lists collection
    match /lists/{listId} {
      allow read, write: if request.auth != null && 
                          request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```

Click **"Publish"** to save the rules.

## ⚙️ Step 4: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"**
4. Click the **Web icon** `</>`  to add a web app
5. Register app nickname: **"TaskMate Web"**
6. **DO NOT** check "Firebase Hosting" (unless you plan to use it)
7. Click **"Register app"**
8. Copy the `firebaseConfig` object

It will look something like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "taskmate-xxxxx.firebaseapp.com",
  projectId: "taskmate-xxxxx",
  storageBucket: "taskmate-xxxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

## 📝 Step 5: Update Your Project Configuration

1. Open your project folder
2. Navigate to `src/js/firebase-config.js`
3. Replace the placeholder config with YOUR actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

4. Save the file

## 🚀 Step 6: Test Your Application

1. Open `index.html` in your browser (or use a local server)
2. Click **"Get Started"** to register a new account
3. Fill in your details and create an account
4. You should be redirected to the login page
5. Login with your new account
6. You should see the dashboard!

## ✅ Verification Steps

### Check Authentication
1. Go to Firebase Console > Authentication > Users
2. You should see your registered user

### Check Firestore Data
1. Go to Firebase Console > Firestore Database
2. After creating tasks, you should see:
   - `users` collection with user documents
   - `tasks` collection with task documents
   - `lists` collection (if you created custom lists)

## 🔧 Troubleshooting

### "Firebase: Error (auth/operation-not-allowed)"
- Make sure Email/Password authentication is enabled in Firebase Console

### "Missing or insufficient permissions"
- Check your Firestore security rules
- Make sure you're logged in
- Verify the rules allow the user to access their own data

### "Firebase configuration error"
- Double-check that you copied the entire firebaseConfig object
- Ensure there are no typos in your configuration
- Make sure all quotes are properly closed

### Tasks not saving/loading
- Open browser DevTools (F12) and check the Console tab for errors
- Verify Firestore rules are published
- Check Network tab to see if Firebase requests are being made

## 📊 Firebase Free Tier Limits

Firebase offers a generous free tier:

**Authentication:**
- 10,000 verifications/month
- More than enough for personal/small projects

**Firestore:**
- 1 GB storage
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day

**Perfect for TaskMate!** You can have hundreds of users and thousands of tasks without paying.

## 🔒 Security Best Practices

1. **Never commit firebase-config.js with real credentials to public repositories**
   - Add it to `.gitignore` if making the repo public
   - Or use environment variables

2. **Keep Firestore rules strict**
   - Users should only access their own data
   - The provided rules ensure this

3. **Use Firebase Console to monitor**
   - Check Authentication tab for suspicious activity
   - Monitor Firestore usage in the Usage tab

## 🆘 Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Stack Overflow - Firebase Tag](https://stackoverflow.com/questions/tagged/firebase)

---

**Congratulations! 🎉** Your TaskMate app is now powered by Firebase with real-time database and secure authentication!
