// src/js/profile.js
import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Profile page loaded');

  // Check authentication
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    await loadUserProfile(user);
  });

  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      // Update active tab button
      tabButtons.forEach(b => {
        b.classList.remove('border-primary-600', 'text-primary-600');
        b.classList.add('border-transparent', 'text-gray-500');
      });
      btn.classList.remove('border-transparent', 'text-gray-500');
      btn.classList.add('border-primary-600', 'text-primary-600');

      // Show corresponding tab content
      tabContents.forEach(content => {
        content.classList.add('hidden');
      });
      document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    });
  });

  // Profile picture upload
  const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
  const photoUpload = document.getElementById('photoUpload');
  const profilePicturePreview = document.getElementById('profilePicturePreview');

  uploadPhotoBtn.addEventListener('click', () => {
    photoUpload.click();
  });

  photoUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      // Show loading
      uploadPhotoBtn.innerHTML = '<svg class="w-5 h-5 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';

      // Upload to Firebase Storage
      const storageRef = ref(storage, `profile-pictures/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      // Update Firebase Auth profile
      await updateProfile(user, { photoURL });

      // Update Firestore profile (use setDoc with merge to create if not exists)
      const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
      await setDoc(profileRef, { 
        photoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update preview
      profilePicturePreview.innerHTML = `<img src="${photoURL}" alt="Profile" class="w-24 h-24 rounded-full object-cover" />`;

      // Reset button
      uploadPhotoBtn.innerHTML = '<svg class="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';

      showNotification('Profile picture updated successfully!', 'success');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
      uploadPhotoBtn.innerHTML = '<svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';
    }
  });

  // Personal Info Form
  const personalInfoForm = document.getElementById('personalInfoForm');
  personalInfoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Show loading state
    const submitBtn = personalInfoForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<svg class="w-5 h-5 animate-spin inline mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...';
    
    try {
      const user = auth.currentUser;
      if (!user) return;

      const fullName = document.getElementById('fullName').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const jobTitle = document.getElementById('jobTitle').value.trim();
      const bio = document.getElementById('bio').value.trim();

      // Validate phone number if provided
      if (phone && !/^[\d\s\+\-\(\)]+$/.test(phone)) {
        showNotification('Please enter a valid phone number', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
      }

      // Update Firebase Auth display name
      if (fullName) {
        await updateProfile(user, { displayName: fullName });
      }

      // Update Firestore profile
      const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
      console.log('Saving profile to:', `users/${user.uid}/profile/data`);
      console.log('Profile data:', { fullName, phone, jobTitle, bio });
      
      await setDoc(profileRef, {
        fullName,
        phone,
        jobTitle,
        bio,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log('✅ Profile saved successfully!');

      // Update display
      document.getElementById('profileDisplayName').textContent = fullName || 'User';

      showNotification('Profile updated successfully!', 'success');
      
      // Reset button
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Failed to update profile. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  // Preferences Form
  const preferencesForm = document.getElementById('preferencesForm');
  preferencesForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const user = auth.currentUser;
      if (!user) return;

      const theme = document.querySelector('input[name="theme"]:checked').value;
      const emailNotifications = document.getElementById('emailNotifications').checked;
      const browserNotifications = document.getElementById('browserNotifications').checked;
      const completionSounds = document.getElementById('completionSounds').checked;
      const defaultView = document.getElementById('defaultView').value;

      // Save preferences to Firestore
      const preferencesRef = doc(db, 'users', user.uid, 'profile', 'preferences');
      await setDoc(preferencesRef, {
        theme,
        emailNotifications,
        browserNotifications,
        completionSounds,
        defaultView,
        updatedAt: new Date().toISOString()
      });

      // Apply theme immediately
      localStorage.setItem('theme', theme);
      applyTheme(theme);

      showNotification('Preferences saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    }
  });

  // Password Change Form
  const passwordForm = document.getElementById('passwordForm');
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user || !user.email) return;

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      alert('Password updated successfully!');
      passwordForm.reset();
    } catch (error) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        alert('Current password is incorrect');
      } else {
        alert('Failed to update password. Please try again.');
      }
    }
  });

  // Export Data
  const exportDataBtn = document.getElementById('exportDataBtn');
  exportDataBtn.addEventListener('click', async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get all user data
      const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
      const profileSnap = await getDoc(profileRef);
      const profile = profileSnap.exists() ? profileSnap.data() : {};

      // Get tasks
      const tasksRef = collection(db, 'tasks');
      const tasksSnap = await getDocs(tasksRef);
      const tasks = tasksSnap.docs
        .filter(doc => doc.data().userId === user.uid)
        .map(doc => ({ id: doc.id, ...doc.data() }));

      // Get lists
      const listsRef = collection(db, 'lists');
      const listsSnap = await getDocs(listsRef);
      const lists = listsSnap.docs
        .filter(doc => doc.data().userId === user.uid)
        .map(doc => ({ id: doc.id, ...doc.data() }));

      // Create export data
      const exportData = {
        profile: {
          email: user.email,
          displayName: user.displayName,
          ...profile
        },
        tasks,
        lists,
        exportDate: new Date().toISOString()
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taskmate-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  });

  // Delete Account Modal
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  const deleteAccountModal = document.getElementById('deleteAccountModal');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const deleteConfirmInput = document.getElementById('deleteConfirmInput');

  deleteAccountBtn.addEventListener('click', () => {
    deleteAccountModal.classList.remove('hidden');
    deleteAccountModal.classList.add('flex');
  });

  cancelDeleteBtn.addEventListener('click', () => {
    deleteAccountModal.classList.add('hidden');
    deleteAccountModal.classList.remove('flex');
    deleteConfirmInput.value = '';
    confirmDeleteBtn.disabled = true;
  });

  deleteConfirmInput.addEventListener('input', (e) => {
    confirmDeleteBtn.disabled = e.target.value !== 'DELETE';
  });

  confirmDeleteBtn.addEventListener('click', async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Delete all user data from Firestore
      // Note: In production, you should use Cloud Functions for this
      
      // Delete user account
      await deleteUser(user);

      alert('Account deleted successfully. You will be redirected to the homepage.');
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Error deleting account:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('For security, please log out and log back in before deleting your account.');
      } else {
        alert('Failed to delete account. Please try again.');
      }
    }
  });
});

// Load user profile data
async function loadUserProfile(user) {
  try {
    // Set email
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('email').value = user.email;

    // Set display name in header
    if (user.displayName) {
      document.getElementById('profileDisplayName').textContent = user.displayName;
      document.getElementById('fullName').value = user.displayName;
    } else {
      document.getElementById('profileDisplayName').textContent = 'User';
    }

    // Set profile picture with initials fallback
    if (user.photoURL) {
      document.getElementById('profilePicturePreview').innerHTML = 
        `<img src="${user.photoURL}" alt="Profile" class="w-24 h-24 rounded-full object-cover" />`;
    } else if (user.displayName) {
      const initials = getUserInitials(user.displayName);
      document.getElementById('profilePicturePreview').innerHTML = 
        `<div class="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center ring-4 ring-primary-100">
          <span class="text-2xl font-bold text-white">${initials}</span>
        </div>`;
    }

    // Load profile data from Firestore
    const profileRef = doc(db, 'users', user.uid, 'profile', 'data');
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      const profile = profileSnap.data();
      
      if (profile.fullName) document.getElementById('fullName').value = profile.fullName;
      if (profile.phone) document.getElementById('phone').value = profile.phone;
      if (profile.jobTitle) document.getElementById('jobTitle').value = profile.jobTitle;
      if (profile.bio) document.getElementById('bio').value = profile.bio;
    }

    // Load preferences
    const preferencesRef = doc(db, 'users', user.uid, 'profile', 'preferences');
    const preferencesSnap = await getDoc(preferencesRef);
    
    if (preferencesSnap.exists()) {
      const prefs = preferencesSnap.data();
      
      if (prefs.theme) {
        document.querySelector(`input[name="theme"][value="${prefs.theme}"]`).checked = true;
      }
      if (prefs.emailNotifications !== undefined) {
        document.getElementById('emailNotifications').checked = prefs.emailNotifications;
      }
      if (prefs.browserNotifications !== undefined) {
        document.getElementById('browserNotifications').checked = prefs.browserNotifications;
      }
      if (prefs.completionSounds !== undefined) {
        document.getElementById('completionSounds').checked = prefs.completionSounds;
      }
      if (prefs.defaultView) {
        document.getElementById('defaultView').value = prefs.defaultView;
      }
    }

  } catch (error) {
    console.error('Error loading profile:', error);
    showNotification('Failed to load profile data', 'error');
  }
}



// Show notification
function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `fixed top-20 right-4 z-50 px-6 py-3 rounded-xl shadow-lg transform transition-all duration-300 translate-x-0 ${
    type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  } text-white font-medium flex items-center gap-2`;
  
  // Add icon
  const icon = type === 'success' 
    ? '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    : type === 'error'
    ? '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    : '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
  
  notification.innerHTML = icon + '<span>' + message + '</span>';
  document.body.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.transform = 'translateX(400px)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Apply theme
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (theme === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (theme === 'auto') {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

// Get user initials for avatar
function getUserInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}


