// Firebase Configuration
// 
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use existing one)
// 3. Enable Authentication (Email/Password)
// 4. Create a Firestore Database (Start in production mode)
// 5. Go to Project Settings > General > Your apps
// 6. Click "Web" (</>) to add a web app
// 7. Copy the firebaseConfig object
// 8. Replace the config below with your actual Firebase credentials

// Import Firebase modules from CDN (for browser compatibility)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDzEddcGQNg5m7-R61r6P1eAefayiCXxdY",
  authDomain: "taskmate-92c2b.firebaseapp.com",
  projectId: "taskmate-92c2b",
  storageBucket: "taskmate-92c2b.firebasestorage.app",
  messagingSenderId: "155458411749",
  appId: "1:155458411749:web:e44e1ebe9c07c338f4c80c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
