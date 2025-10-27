// src/js/auth.js - Authentication handling

document.addEventListener('DOMContentLoaded', () => {
  // Storage keys
  const USERS_KEY = 'taskmate_users';
  const CURRENT_USER_KEY = 'taskmate_current_user';

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

  const getUsers = () => {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  };

  const saveUsers = (users) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };

  const setCurrentUser = (user) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  };

  const getCurrentUser = () => {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
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

    // Handle login form submission
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = $('email').value.trim();
      const password = $('password').value;
      const remember = $('remember').checked;

      // Validate email
      if (!validateEmail(email)) {
        showError('loginError', 'loginErrorText', 'Please enter a valid email address');
        return;
      }

      // Get users from localStorage
      const users = getUsers();
      const user = users.find(u => u.email === email);

      if (!user) {
        showError('loginError', 'loginErrorText', 'No account found with this email');
        return;
      }

      if (user.password !== password) {
        showError('loginError', 'loginErrorText', 'Incorrect password');
        return;
      }

      // Successful login
      const userSession = {
        id: user.id,
        name: user.name,
        email: user.email,
        remember: remember,
        loginTime: new Date().toISOString()
      };

      setCurrentUser(userSession);
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    });
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

    // Handle registration form submission
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const fullName = $('fullName').value.trim();
      const email = $('regEmail').value.trim();
      const password = $('regPassword').value;
      const confirmPassword = $('confirmPassword').value;
      const termsAccepted = $('terms').checked;

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

      // Check if user already exists
      const users = getUsers();
      if (users.some(u => u.email === email)) {
        showError('registerError', 'registerErrorText', 'An account with this email already exists');
        return;
      }

      // Create new user
      const newUser = {
        id: Date.now(),
        name: fullName,
        email: email,
        password: password,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      saveUsers(users);

      // Show success message
      showSuccess('registerSuccess', 'registerSuccessText', 'Account created successfully! Redirecting to login...');
      
      // Clear form
      registerForm.reset();

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    });
  }

  // ==================== CHECK AUTHENTICATION ON DASHBOARD ====================
  // This will be called from dashboard.html
  window.checkAuth = () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = 'login.html';
      return null;
    }
    return currentUser;
  };

  // ==================== LOGOUT FUNCTION ====================
  window.logout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'login.html';
  };
});
