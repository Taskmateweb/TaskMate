# 🚨 URGENT FIX - Firebase Permissions Error

## Problem
Getting "Missing or insufficient permissions" error for:
- ❌ Tasks
- ❌ Calendar events
- ❌ Lists

## Quick Fix (5 minutes)

### Step 1: Open Firebase Console
Go to: https://console.firebase.google.com/project/taskmate-92c2b/firestore/rules

### Step 2: Copy These Rules
Select ALL the text in the rules editor and delete it.
Then paste this EXACT code:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    match /tasks/{taskId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    match /lists/{listId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /tasks/{taskId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /lists/{listId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /events/{eventId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### Step 3: Publish
Click the blue **"Publish"** button at the top

### Step 4: Refresh Your App
- Go back to TaskMate
- Refresh the page (F5)
- Try adding a task or event
- ✅ It should work now!

## What This Does

These rules allow:
- ✅ Users to read/write their OWN tasks
- ✅ Users to read/write their OWN lists
- ✅ Users to read/write their OWN events
- ❌ Users CANNOT see other users' data
- ❌ Unauthenticated users CANNOT access anything

## If Still Not Working

1. Make sure you're logged in to TaskMate
2. Clear browser cache (Ctrl+Shift+Delete)
3. Log out and log back in
4. Check browser console (F12) for any other errors

---

**Direct Link to Rules:**
https://console.firebase.google.com/project/taskmate-92c2b/firestore/rules
