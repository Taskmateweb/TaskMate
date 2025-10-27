// Firebase Database Service
// Handles all Firestore operations for tasks and user data

import { auth, db } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where,
  orderBy,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ==================== TASKS OPERATIONS ====================

export const tasksService = {
  // Get all tasks for current user
  async getAllTasks() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  },

  // Add a new task
  async addTask(taskData) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const tasksRef = collection(db, 'tasks');
      const docRef = await addDoc(tasksRef, {
        ...taskData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        id: docRef.id,
        ...taskData
      };
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  },

  // Update a task
  async updateTask(taskId, updates) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      return { id: taskId, ...updates };
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  },

  // Delete a task
  async deleteTask(taskId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
      
      return taskId;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  },

  // Get a single task
  async getTask(taskId) {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (taskSnap.exists()) {
        return {
          id: taskSnap.id,
          ...taskSnap.data()
        };
      } else {
        throw new Error('Task not found');
      }
    } catch (error) {
      console.error('Error getting task:', error);
      throw error;
    }
  }
};

// ==================== LISTS OPERATIONS ====================

export const listsService = {
  // Get all lists for current user
  async getAllLists() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const listsRef = collection(db, 'lists');
      const q = query(listsRef, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const customLists = snapshot.docs.map(doc => doc.data().name);
      
      // Combine default lists with custom lists
      const defaultLists = ["Personal", "Work", "Shopping", "Ideas", "Travel", 
        "Movies", "Books", "Music", "Fitness", "Finance", "Home", "Projects", 
        "Events", "Goals", "Habits", "Routines"];
      
      return [...defaultLists, ...customLists];
    } catch (error) {
      console.error('Error getting lists:', error);
      throw error;
    }
  },

  // Add a new custom list
  async addList(listName) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const listsRef = collection(db, 'lists');
      await addDoc(listsRef, {
        name: listName,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      return listName;
    } catch (error) {
      console.error('Error adding list:', error);
      throw error;
    }
  }
};

// ==================== USER PROFILE OPERATIONS ====================

export const userService = {
  // Get user profile
  async getUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      return updates;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
};
