// src/js/focus.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, query, where, getDocs, addDoc, orderBy, limit, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let selectedTask = null;
let focusDuration = 25; // default 25 minutes
let timerInterval = null;
let remainingTime = 0;
let totalTime = 0;
let isPaused = false;
let startTime = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log('Focus mode page loaded');

  // Check authentication
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = user;
    await loadUndoneTasks();
    await loadTodayActivity();
    await loadRecentSessions();
  });

  // Duration preset buttons
  document.querySelectorAll('.duration-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.duration-preset').forEach(b => {
        b.classList.remove('border-purple-500', 'bg-purple-50');
        b.classList.add('border-gray-200');
      });
      btn.classList.remove('border-gray-200');
      btn.classList.add('border-purple-500', 'bg-purple-50');
      
      const minutes = parseInt(btn.dataset.minutes);
      document.getElementById('customMinutesInput').value = minutes;
    });
  });

  // Custom time input
  document.getElementById('customMinutesInput').addEventListener('input', (e) => {
    document.querySelectorAll('.duration-preset').forEach(b => {
      b.classList.remove('border-purple-500', 'bg-purple-50');
      b.classList.add('border-gray-200');
    });
  });

  // Modal controls
  document.getElementById('cancelCustomTime').addEventListener('click', () => {
    document.getElementById('customTimeModal').classList.add('hidden');
    document.getElementById('customTimeModal').classList.remove('flex');
  });

  document.getElementById('confirmCustomTime').addEventListener('click', () => {
    const minutes = parseInt(document.getElementById('customMinutesInput').value);
    if (minutes < 1 || minutes > 180) {
      alert('Please enter a duration between 1 and 180 minutes');
      return;
    }
    focusDuration = minutes;
    startFocusSession();
    document.getElementById('customTimeModal').classList.add('hidden');
    document.getElementById('customTimeModal').classList.remove('flex');
  });

  // Timer controls
  document.getElementById('startTimerBtn').addEventListener('click', startTimer);
  document.getElementById('pauseTimerBtn').addEventListener('click', pauseTimer);
  document.getElementById('resumeTimerBtn').addEventListener('click', resumeTimer);
  document.getElementById('stopTimerBtn').addEventListener('click', stopTimer);
  document.getElementById('changeTaskBtn').addEventListener('click', changeTask);

  // Congratulations modal
  document.getElementById('closeCongratsModal').addEventListener('click', () => {
    document.getElementById('congratsModal').classList.add('hidden');
    document.getElementById('congratsModal').classList.remove('flex');
    changeTask();
  });
});

// Load undone tasks
async function loadUndoneTasks() {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('userId', '==', currentUser.uid));
    const querySnapshot = await getDocs(q);

    const undoneTasks = [];
    querySnapshot.forEach((doc) => {
      const task = { id: doc.id, ...doc.data() };
      if (task.status !== 'Done') {
        undoneTasks.push(task);
      }
    });

    const tasksList = document.getElementById('tasksList');
    const emptyState = document.getElementById('emptyTaskState');

    if (undoneTasks.length === 0) {
      tasksList.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    tasksList.innerHTML = undoneTasks.map(task => `
      <div class="task-item p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all cursor-pointer"
           data-task-id="${task.id}"
           data-task-title="${escapeHtml(task.title)}"
           data-task-priority="${task.priority || 'Medium'}"
           data-task-due="${task.dueDate || 'No due date'}">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900 mb-1">${escapeHtml(task.title)}</h4>
            <div class="flex items-center gap-3 text-xs text-gray-600">
              ${task.list ? `<span class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                </svg>
                ${escapeHtml(task.list)}
              </span>` : ''}
              ${task.dueDate ? `<span class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                ${task.dueDate}
              </span>` : ''}
            </div>
          </div>
          <span class="px-2 py-1 rounded-lg text-xs font-semibold ${getPriorityColor(task.priority)}">
            ${task.priority || 'Medium'}
          </span>
        </div>
      </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.task-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedTask = {
          id: item.dataset.taskId,
          title: item.dataset.taskTitle,
          priority: item.dataset.taskPriority,
          dueDate: item.dataset.taskDue
        };
        showCustomTimeModal();
      });
    });

  } catch (error) {
    console.error('Error loading tasks:', error);
  }
}

// Show custom time modal
function showCustomTimeModal() {
  document.getElementById('customTimeModal').classList.remove('hidden');
  document.getElementById('customTimeModal').classList.add('flex');
}

// Start focus session
function startFocusSession() {
  // Hide task selection, show timer
  document.getElementById('taskSelectionSection').classList.add('hidden');
  document.getElementById('timerSection').classList.remove('hidden');

  // Set task details
  document.getElementById('currentTaskTitle').textContent = selectedTask.title;
  document.getElementById('currentTaskDetails').textContent = `Priority: ${selectedTask.priority} | Due: ${selectedTask.dueDate}`;

  // Initialize timer
  totalTime = focusDuration * 60; // convert to seconds
  remainingTime = totalTime;
  startTime = new Date();
  updateTimerDisplay();
  updateProgress();
}

// Start timer
function startTimer() {
  if (timerInterval) return;

  document.getElementById('startTimerBtn').classList.add('hidden');
  document.getElementById('pauseTimerBtn').classList.remove('hidden');
  document.getElementById('stopTimerBtn').classList.remove('hidden');
  document.getElementById('timerStatus').textContent = 'Focus time! 🎯';

  isPaused = false;
  
  timerInterval = setInterval(() => {
    if (!isPaused && remainingTime > 0) {
      remainingTime--;
      updateTimerDisplay();
      updateProgress();

      if (remainingTime === 0) {
        completeSession();
      }
    }
  }, 1000);
}

// Pause timer
function pauseTimer() {
  isPaused = true;
  document.getElementById('pauseTimerBtn').classList.add('hidden');
  document.getElementById('resumeTimerBtn').classList.remove('hidden');
  document.getElementById('timerStatus').textContent = 'Paused';
}

// Resume timer
function resumeTimer() {
  isPaused = false;
  document.getElementById('resumeTimerBtn').classList.add('hidden');
  document.getElementById('pauseTimerBtn').classList.remove('hidden');
  document.getElementById('timerStatus').textContent = 'Focus time! 🎯';
}

// Stop timer
function stopTimer() {
  if (confirm('Are you sure you want to stop this focus session?')) {
    clearInterval(timerInterval);
    timerInterval = null;
    resetTimer();
  }
}

// Complete session
async function completeSession() {
  clearInterval(timerInterval);
  timerInterval = null;

  // Play alarm sound for 5 seconds
  try {
    const alarm = document.getElementById('alarmSound');
    alarm.currentTime = 0;
    alarm.play().catch(e => console.log('Could not play alarm:', e));
    
    // Stop alarm after 5 seconds
    setTimeout(() => {
      alarm.pause();
      alarm.currentTime = 0;
    }, 5000);
  } catch (error) {
    console.log('Alarm error:', error);
  }

  // Save to database
  try {
    const sessionData = {
      userId: currentUser.uid,
      taskId: selectedTask.id,
      taskTitle: selectedTask.title,
      duration: focusDuration,
      completedAt: Timestamp.now(),
      status: 'completed',
      date: new Date().toISOString().split('T')[0]
    };

    console.log('Saving focus session:', sessionData);
    const docRef = await addDoc(collection(db, 'focusSessions'), sessionData);
    console.log('Focus session saved to database with ID:', docRef.id);

    // Update activity stats
    await loadTodayActivity();
    await loadRecentSessions();

  } catch (error) {
    console.error('Error saving focus session:', error);
    alert('Failed to save session: ' + error.message);
  }

  // Show congratulations modal
  document.getElementById('completedDuration').textContent = `${focusDuration} minutes`;
  document.getElementById('completedTaskName').textContent = selectedTask.title;
  document.getElementById('congratsModal').classList.remove('hidden');
  document.getElementById('congratsModal').classList.add('flex');

  resetTimer();
}

// Reset timer
function resetTimer() {
  document.getElementById('startTimerBtn').classList.remove('hidden');
  document.getElementById('pauseTimerBtn').classList.add('hidden');
  document.getElementById('resumeTimerBtn').classList.add('hidden');
  document.getElementById('stopTimerBtn').classList.add('hidden');
  document.getElementById('timerStatus').textContent = 'Ready to start';
  
  remainingTime = totalTime;
  isPaused = false;
  updateTimerDisplay();
  updateProgress();
}

// Change task
function changeTask() {
  clearInterval(timerInterval);
  timerInterval = null;
  selectedTask = null;
  
  document.getElementById('timerSection').classList.add('hidden');
  document.getElementById('taskSelectionSection').classList.remove('hidden');
  
  loadUndoneTasks();
}

// Update timer display
function updateTimerDisplay() {
  const minutes = Math.floor(remainingTime / 60);
  const seconds = remainingTime % 60;
  document.getElementById('timerDisplay').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Update progress circle
function updateProgress() {
  const progress = ((totalTime - remainingTime) / totalTime) * 565.48;
  document.getElementById('timerProgress').style.strokeDashoffset = progress;
}

// Load today's activity
async function loadTodayActivity() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const sessionsRef = collection(db, 'focusSessions');
    const q = query(
      sessionsRef,
      where('userId', '==', currentUser.uid),
      where('date', '==', today)
    );
    
    const querySnapshot = await getDocs(q);
    
    let totalMinutes = 0;
    let completedCount = 0;
    let totalCount = querySnapshot.size;
    
    querySnapshot.forEach((doc) => {
      const session = doc.data();
      totalMinutes += session.duration;
      if (session.status === 'completed') {
        completedCount++;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    let timeText = '';
    if (hours > 0) {
      timeText = `${hours}h ${minutes}m`;
    } else {
      timeText = `${minutes}m`;
    }

    document.getElementById('todayTotalTime').textContent = timeText;
    document.getElementById('todayCompletedSessions').textContent = completedCount;
    document.getElementById('todayTotalSessions').textContent = totalCount;

  } catch (error) {
    console.error('Error loading today activity:', error);
  }
}

// Load recent sessions
async function loadRecentSessions() {
  try {
    const sessionsList = document.getElementById('recentSessionsList');
    const emptyState = document.getElementById('emptySessionState');

    if (!currentUser) {
      console.log('No user logged in');
      return;
    }

    // Get start of today (00:00:00)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();

    const sessionsRef = collection(db, 'focusSessions');
    
    // Simple query - just get user's sessions, filter in JavaScript
    const q = query(
      sessionsRef,
      where('userId', '==', currentUser.uid)
    );
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No sessions found for user:', currentUser.uid);
      sessionsList.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    console.log('Total sessions found:', querySnapshot.size);
    
    const sessions = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Filter for today's sessions only
      if (data.completedAt) {
        const completedTime = data.completedAt.toDate ? data.completedAt.toDate().getTime() : data.completedAt.seconds * 1000;
        
        // Only include if completed today
        if (completedTime >= todayStartTime) {
          console.log('Today\'s session data:', data);
          sessions.push({ id: doc.id, ...data });
        }
      }
    });

    // Check if we have any sessions for today
    if (sessions.length === 0) {
      console.log('No sessions completed today');
      sessionsList.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    console.log('Found today\'s sessions:', sessions.length);
    emptyState.classList.add('hidden');

    // Sort by most recent first
    sessions.sort((a, b) => {
      const timeA = a.completedAt?.toDate?.() || new Date(0);
      const timeB = b.completedAt?.toDate?.() || new Date(0);
      return timeB - timeA;
    });

    sessionsList.innerHTML = sessions.map(session => {
      const date = session.completedAt?.toDate?.() || new Date();
      const timeAgo = getTimeAgo(date);
      const taskTitle = session.taskTitle || 'Untitled Task';
      const duration = session.duration || 0;
      
      return `
        <div class="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
              <h4 class="font-semibold text-sm text-gray-900">${escapeHtml(taskTitle)}</h4>
              <p class="text-xs text-gray-600 mt-1">${timeAgo}</p>
            </div>
            <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold">
              ${duration}m
            </span>
          </div>
          ${session.status === 'completed' ? `
            <div class="flex items-center gap-1 text-xs text-green-600">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Completed
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading recent sessions:', error);
    const sessionsList = document.getElementById('recentSessionsList');
    const emptyState = document.getElementById('emptySessionState');
    if (sessionsList && emptyState) {
      sessionsList.innerHTML = `
        <div class="p-3 bg-red-50 rounded-xl text-red-600 text-sm">
          Error loading sessions. Please check console.
        </div>
      `;
    }
  }
}

// Helper functions
function getPriorityColor(priority) {
  switch (priority) {
    case 'High':
      return 'bg-red-100 text-red-700';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'Low':
      return 'bg-green-100 text-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString();
}
