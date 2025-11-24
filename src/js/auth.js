// src/js/auth.js - Firebase Authentication handling

import { auth } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { db } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  // Helper functions
  const $ = id => document.getElementById(id);
  
  const showError = (elementId, textId, message) => {
    const errorEl = $(elementId);
    const textEl = $(textId);
    if (errorEl && textEl) {
      textEl.textContent = message;
      errorEl.classList.remove('hidden');
      setTimeout(() => errorEl.classList.add('hidden'), 5000);
    }
  };

  const showSuccess = (elementId, textId, message) => {
    const successEl = $(elementId);
    const textEl = $(textId);
    if (successEl && textEl) {
      textEl.textContent = message;
      successEl.classList.remove('hidden');
      setTimeout(() => successEl.classList.add('hidden'), 3000);
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // ==================== LOGIN PAGE ====================
  const loginForm = $('loginForm');
  if (loginForm) {
    const togglePassword = $('togglePassword');
    const passwordInput = $('password');
    const eyeIcon = $('eyeIcon');

    // Toggle password visibility
    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Toggle eye icon
        if (type === 'text') {
          eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          `;
        } else {
          eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          `;
        }
      });
    }

    // Handle login form submission with Firebase
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = $('email').value.trim();
      const password = $('password').value;
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      // Validate email
      if (!validateEmail(email)) {
        showError('loginError', 'loginErrorText', 'Please enter a valid email address');
        return;
      }

      // Disable submit button
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';

      try {
        // Sign in with Firebase
        await signInWithEmailAndPassword(auth, email, password);
        
        // Redirect to dashboard (auth state observer will handle this)
        window.location.href = 'dashboard.html';
      } catch (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Failed to sign in';
        switch (error.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password';
            break;
          default:
            errorMessage = error.message;
        }
        
        showError('loginError', 'loginErrorText', errorMessage);
        
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    });

    // ==================== FORGOT PASSWORD FUNCTIONALITY ====================
    const forgotPasswordLink = $('forgotPasswordLink');
    const forgotPasswordModal = $('forgotPasswordModal');
    const closeForgotModal = $('closeForgotModal');
    const cancelReset = $('cancelReset');
    const forgotPasswordForm = $('forgotPasswordForm');

    // Open forgot password modal
    if (forgotPasswordLink && forgotPasswordModal) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        forgotPasswordModal.classList.remove('hidden');
        $('resetEmail').focus();
      });
    }

    // Close modal handlers
    const closeForgotPasswordModal = () => {
      if (forgotPasswordModal) {
        forgotPasswordModal.classList.add('hidden');
        // Clear form and messages
        if (forgotPasswordForm) forgotPasswordForm.reset();
        if ($('resetSuccess')) $('resetSuccess').classList.add('hidden');
        if ($('resetError')) $('resetError').classList.add('hidden');
      }
    };

    if (closeForgotModal) {
      closeForgotModal.addEventListener('click', closeForgotPasswordModal);
    }

    if (cancelReset) {
      cancelReset.addEventListener('click', closeForgotPasswordModal);
    }

    // Close modal when clicking outside
    if (forgotPasswordModal) {
      forgotPasswordModal.addEventListener('click', (e) => {
        if (e.target === forgotPasswordModal) {
          closeForgotPasswordModal();
        }
      });
    }

    // Handle forgot password form submission
    if (forgotPasswordForm) {
      forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = $('resetEmail').value.trim();
        const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');

        // Validate email
        if (!validateEmail(email)) {
          showError('resetError', 'resetErrorText', 'Please enter a valid email address');
          return;
        }

        // Hide previous messages
        if ($('resetError')) $('resetError').classList.add('hidden');
        if ($('resetSuccess')) $('resetSuccess').classList.add('hidden');

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        try {
          // Send password reset email
          await sendPasswordResetEmail(auth, email);
          
          // Show success message
          showSuccess('resetSuccess', 'resetSuccessText', 'Password reset email sent! Check your inbox.');
          
          // Clear form
          forgotPasswordForm.reset();

          // Close modal after 3 seconds
          setTimeout(() => {
            closeForgotPasswordModal();
          }, 3000);
          
        } catch (error) {
          console.error('Password reset error:', error);
          
          let errorMessage = 'Failed to send reset email';
          switch (error.code) {
            case 'auth/user-not-found':
              errorMessage = 'No account found with this email address';
              break;
            case 'auth/invalid-email':
              errorMessage = 'Invalid email address';
              break;
            case 'auth/too-many-requests':
              errorMessage = 'Too many requests. Please try again later';
              break;
            default:
              errorMessage = error.message;
          }
          
          showError('resetError', 'resetErrorText', errorMessage);
        } finally {
          // Re-enable submit button
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Reset Link';
        }
      });
    }
  }

  // ==================== REGISTER PAGE ====================
  const registerForm = $('registerForm');
  if (registerForm) {
    const toggleRegPassword = $('toggleRegPassword');
    const regPasswordInput = $('regPassword');
    const regEyeIcon = $('regEyeIcon');

    // Toggle password visibility
    if (toggleRegPassword && regPasswordInput) {
      toggleRegPassword.addEventListener('click', () => {
        const type = regPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        regPasswordInput.setAttribute('type', type);
        
        if (type === 'text') {
          regEyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          `;
        } else {
          regEyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          `;
        }
      });
    }

    // Handle registration form submission with Firebase
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const fullName = $('fullName').value.trim();
      const email = $('regEmail').value.trim();
      const password = $('regPassword').value;
      const confirmPassword = $('confirmPassword').value;
      const termsAccepted = $('terms').checked;
      const submitBtn = registerForm.querySelector('button[type="submit"]');

      // Validation
      if (!fullName || fullName.length < 2) {
        showError('registerError', 'registerErrorText', 'Please enter your full name');
        return;
      }

      if (!validateEmail(email)) {
        showError('registerError', 'registerErrorText', 'Please enter a valid email address');
        return;
      }

      if (password.length < 8) {
        showError('registerError', 'registerErrorText', 'Password must be at least 8 characters');
        return;
      }

      if (password !== confirmPassword) {
        showError('registerError', 'registerErrorText', 'Passwords do not match');
        return;
      }

      if (!termsAccepted) {
        showError('registerError', 'registerErrorText', 'You must accept the terms and conditions');
        return;
      }

      // Disable submit button
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account...';

      try {
        // Create user with Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update user profile with display name
        await updateProfile(user, {
          displayName: fullName
        });

        // Save user data to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          name: fullName,
          email: email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Show success message
        showSuccess('registerSuccess', 'registerSuccessText', 'Account created successfully! Redirecting to login...');
        
        // Clear form
        registerForm.reset();

        // Redirect to login page after 2 seconds
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);
        
      } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Failed to create account';
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password accounts are not enabled';
            break;
          default:
            errorMessage = error.message;
        }
        
        showError('registerError', 'registerErrorText', errorMessage);
        
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }

  // ==================== CHECK AUTHENTICATION ====================
  window.checkAuth = () => {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          window.location.href = 'login.html';
          resolve(null);
        } else {
          resolve({
            uid: user.uid,
            name: user.displayName,
            email: user.email
          });
        }
      });
    });
  };

  // ==================== LOGOUT FUNCTION ====================
  window.logout = async () => {
    try {
      await signOut(auth);
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Logout error:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  // ==================== GET CURRENT USER ====================
  window.getCurrentUser = () => {
    return auth.currentUser;
  };
});
