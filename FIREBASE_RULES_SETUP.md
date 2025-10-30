# Firebase Security Rules Setup

## Problem
You're getting "permission-denied" error when trying to save calendar events.

## Solution
You need to update your Firebase Firestore Security Rules to allow authenticated users to create and manage their events.

## Steps to Fix:

### Option 1: Via Firebase Console (Recommended)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: **TaskMate**

2. **Navigate to Firestore Database**
   - Click on **"Firestore Database"** in the left sidebar
   - Click on the **"Rules"** tab at the top

3. **Update the Rules**
   - Replace the existing rules with the rules from `firestore.rules` file
   - Or copy this code:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Root-level tasks collection (used by current app)
    match /tasks/{taskId} {
      // Allow read if user is authenticated and task belongs to them
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      
      // Allow create if user is authenticated and userId matches
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
      
      // Allow update/delete if user is authenticated and owns the task
      allow update, delete: if request.auth != null && 
                               resource.data.userId == request.auth.uid;
    }
    
    // Root-level lists collection
    match /lists/{listId} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
                               resource.data.userId == request.auth.uid;
    }
    
    // Users collection with subcollections
    match /users/{userId} {
      // Allow read/write if the user is authenticated and matches the userId
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Tasks subcollection (if used)
      match /tasks/{taskId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Lists subcollection (if used)
      match /lists/{listId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Events subcollection (for calendar)
      match /events/{eventId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

4. **Publish the Rules**
   - Click the **"Publish"** button
   - Wait for confirmation message

5. **Test Your Calendar**
   - Go back to your TaskMate app
   - Try creating a new event
   - It should now work! ✅

### Option 2: Using Firebase CLI (Advanced)

If you have Firebase CLI installed:

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

## What These Rules Do:

- ✅ Allow authenticated users to read/write their own data
- ✅ Each user can only access documents where userId matches their auth.uid
- ✅ Protects user data from unauthorized access
- ✅ Enables calendar events, tasks, and lists functionality

## Security Features:

1. **Authentication Required**: `request.auth != null`
   - Only logged-in users can access data

2. **User Isolation**: `request.auth.uid == userId`
   - Users can only see/modify their own data
   - Prevents access to other users' information

3. **Subcollection Protection**:
   - Tasks, Lists, and Events inherit the parent user's security
   - Maintains data privacy at all levels

## After Updating Rules:

Your calendar (and all other features) should work perfectly:
- ✅ Create events
- ✅ Edit events
- ✅ Delete events
- ✅ View events
- ✅ All task operations
- ✅ All list operations

## Note:
The rules file `firestore.rules` in this project is for reference. The actual rules must be deployed via Firebase Console or Firebase CLI.
