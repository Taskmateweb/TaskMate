import { db, auth } from './firebase-config.js';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

class Reports {
  constructor() {
    this.currentPeriod = 'today';
    this.charts = {};
    this.user = null;
    
    this.initAuth();
  }

  initAuth() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.user = user;
        this.initializeEventListeners();
        this.loadReports();
      } else {
        window.location.href = 'login.html';
      }
    });
  }

  initializeEventListeners() {
    const periodBtns = document.querySelectorAll('.period-btn');
    periodBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        periodBtns.forEach(b => {
          b.classList.remove('active', 'bg-gradient-to-r', 'from-primary-500', 'to-secondary-500', 'text-white', 'shadow-md');
          b.classList.add('bg-gray-100', 'text-gray-700');
        });
        
        e.target.classList.add('active', 'bg-gradient-to-r', 'from-primary-500', 'to-secondary-500', 'text-white', 'shadow-md');
        e.target.classList.remove('bg-gray-100', 'text-gray-700');
        
        this.currentPeriod = e.target.dataset.period;
        this.loadReports();
      });
    });

    // Profile menu toggle
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    
    if (profileBtn && profileMenu) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = profileMenu.classList.contains('opacity-0');
        
        if (isHidden) {
          profileMenu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
          profileMenu.classList.add('opacity-100', 'scale-100');
        } else {
          profileMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
          profileMenu.classList.remove('opacity-100', 'scale-100');
        }
      });

      document.addEventListener('click', () => {
        profileMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
        profileMenu.classList.remove('opacity-100', 'scale-100');
      });
    }

    // Update profile email
    if (this.user) {
      const profileEmail = document.getElementById('profileEmail');
      if (profileEmail) {
        profileEmail.textContent = this.user.email;
      }
    }
  }

  async loadReports() {
    try {
      if (!this.user) return;

      console.log(`Loading reports for period: ${this.currentPeriod}`);
      const dateRange = this.getDateRange(this.currentPeriod);
      console.log('Date range:', { start: dateRange.start, end: dateRange.end });
      
      const [tasks, focusSessions] = await Promise.all([
        this.loadTasks(this.user.uid, dateRange),
        this.loadFocusSessions(this.user.uid, dateRange)
      ]);

      this.displayStats(tasks, focusSessions, dateRange);
      this.renderCharts(tasks, focusSessions, dateRange);
      this.displayRecentActivity(tasks, focusSessions, dateRange);
      this.generateInsights(tasks, focusSessions, dateRange);
      
    } catch (error) {
      console.error('Error loading reports:', error);
      alert('Error loading reports. Check console for details.');
    }
  }

  getDateRange(period) {
    const now = new Date();
    let start = new Date();
    
    switch(period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'all':
        start = new Date(2020, 0, 1);
        break;
    }
    
    return { start, end: now };
  }

  async loadTasks(userId, dateRange) {
    try {
      // Load ALL user tasks, we'll filter by completion date later
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(tasksQuery);
      const tasks = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        tasks.push({ id: doc.id, ...data });
      });

      console.log(`Loaded ${tasks.length} total tasks for reports`);
      return tasks;
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  }

  async loadFocusSessions(userId, dateRange) {
    try {
      // Load ALL focus sessions for the user
      const sessionsQuery = query(
        collection(db, 'focusSessions'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(sessionsQuery);
      const sessions = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        sessions.push({ id: doc.id, ...data });
      });

      console.log(`Loaded ${sessions.length} focus sessions for reports`);
      return sessions;
    } catch (error) {
      console.error('Error loading focus sessions:', error);
      return [];
    }
  }

  displayStats(tasks, focusSessions, dateRange) {
    // Filter tasks and sessions by the selected date range
    const filteredTasks = tasks.filter(task => {
      if (!task.createdAt) return false;
      const createdDate = task.createdAt.toDate();
      return createdDate >= dateRange.start && createdDate <= dateRange.end;
    });
    
    const filteredSessions = focusSessions.filter(session => {
      if (!session.startTime && !session.createdAt) return false;
      const sessionDate = (session.startTime || session.createdAt).toDate();
      return sessionDate >= dateRange.start && sessionDate <= dateRange.end;
    });
    
    const completedTasks = filteredTasks.filter(t => t.completed || t.status === 'Done').length;
    const totalTasks = filteredTasks.length;
    const totalFocusTime = filteredSessions.reduce((acc, s) => acc + (s.timeSpent || 0), 0);
    const hours = Math.floor(totalFocusTime / 3600);
    const minutes = Math.floor((totalFocusTime % 3600) / 60);
    
    const completionRate = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;
    
    const productivityScore = this.calculateProductivityScore(filteredTasks, filteredSessions);

    console.log('Stats:', {
      totalTasks,
      completedTasks,
      completionRate,
      focusSessionCount: filteredSessions.length,
      totalFocusTime: `${hours}h ${minutes}m`,
      productivityScore
    });

    const totalCompletedEl = document.getElementById('totalCompleted');
    const totalFocusTimeEl = document.getElementById('totalFocusTime');
    const completionRateEl = document.getElementById('completionRate');
    const productivityScoreEl = document.getElementById('productivityScore');

    if (totalCompletedEl) totalCompletedEl.textContent = completedTasks;
    if (totalFocusTimeEl) totalFocusTimeEl.textContent = `${hours}h ${minutes}m`;
    if (completionRateEl) completionRateEl.textContent = `${completionRate}%`;
    if (productivityScoreEl) productivityScoreEl.textContent = productivityScore;
    
    // Update trend indicators
    const completedTrend = document.getElementById('completedTrend');
    const focusTrend = document.getElementById('focusTrend');
    const rateTrend = document.getElementById('rateTrend');
    const scoreTrend = document.getElementById('scoreTrend');
    
    if (completedTrend) completedTrend.textContent = `${totalTasks} total tasks`;
    if (focusTrend) focusTrend.textContent = `${filteredSessions.length} sessions`;
    if (rateTrend) rateTrend.textContent = completionRate >= 70 ? 'Excellent!' : completionRate >= 50 ? 'Good progress' : 'Keep going!';
    if (scoreTrend) scoreTrend.textContent = productivityScore >= 70 ? 'High productivity' : productivityScore >= 40 ? 'Steady progress' : 'Building momentum';
  }

  calculateProductivityScore(tasks, focusSessions) {
    const completedTasks = tasks.filter(t => t.completed).length;
    const completedSessions = focusSessions.filter(s => s.completed).length;
    const avgFocusTime = focusSessions.length > 0 
      ? focusSessions.reduce((acc, s) => acc + (s.timeSpent || 0), 0) / focusSessions.length / 60
      : 0;
    
    const score = Math.round(
      (completedTasks * 5) + 
      (completedSessions * 3) + 
      (avgFocusTime * 0.5)
    );
    
    return Math.min(score, 100);
  }

  renderCharts(tasks, focusSessions, dateRange) {
    this.renderCompletionTrendChart(tasks, dateRange);
    this.renderFocusSessionsChart(focusSessions, dateRange);
    this.renderPriorityChart(tasks);
    this.renderCategoryChart(tasks);
  }

  renderCompletionTrendChart(tasks, dateRange) {
    const ctx = document.getElementById('completionTrendChart');
    if (!ctx) return;

    if (this.charts.completionTrend) {
      this.charts.completionTrend.destroy();
    }

    const days = this.getDaysInRange(dateRange);
    const completionData = days.map(day => {
      return tasks.filter(t => {
        if (!t.completedAt) return false;
        const completedDate = t.completedAt.toDate().toDateString();
        return completedDate === day.toDateString();
      }).length;
    });

    // If no data, show sample data
    const hasData = completionData.some(val => val > 0);
    const displayData = hasData ? completionData : [0, 1, 0, 2, 1, 0, 0];

    this.charts.completionTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Tasks Completed',
          data: displayData,
          borderColor: hasData ? 'rgb(34, 197, 94)' : 'rgba(34, 197, 94, 0.3)',
          backgroundColor: hasData ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: hasData
          }
        },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });

    // Show message if no data
    if (!hasData) {
      const chartParent = ctx.parentElement;
      // Remove any existing overlay first
      const existingOverlay = chartParent.querySelector('.no-data-overlay');
      if (existingOverlay) existingOverlay.remove();
      
      if (!chartParent.querySelector('.no-data-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'no-data-overlay absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl z-10 pointer-events-none';
        overlay.innerHTML = `
          <div class="text-center p-6">
            <svg class="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p class="text-gray-600 font-medium">No task completion data yet</p>
            <p class="text-sm text-gray-400 mt-1">Start completing tasks to see trends</p>
          </div>
        `;
        if (chartParent.style.position !== 'relative' && chartParent.style.position !== 'absolute') {
          chartParent.style.position = 'relative';
        }
        chartParent.appendChild(overlay);
      }
    } else {
      // Remove overlay if data exists
      const overlay = ctx.parentElement.querySelector('.no-data-overlay');
      if (overlay) overlay.remove();
    }
  }

  renderFocusSessionsChart(focusSessions, dateRange) {
    const ctx = document.getElementById('focusSessionsChart');
    if (!ctx) return;

    if (this.charts.focusSessions) {
      this.charts.focusSessions.destroy();
    }

    const days = this.getDaysInRange(dateRange);
    const sessionData = days.map(day => {
      const sessions = focusSessions.filter(s => {
        const sessionDate = s.startTime.toDate().toDateString();
        return sessionDate === day.toDateString();
      });
      return sessions.reduce((acc, s) => acc + (s.timeSpent || 0) / 60, 0);
    });

    // If no data, show sample data
    const hasData = sessionData.some(val => val > 0);
    const displayData = hasData ? sessionData : [0, 25, 0, 45, 30, 0, 0];

    this.charts.focusSessions = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Focus Time (minutes)',
          data: displayData,
          backgroundColor: hasData ? 'rgba(147, 51, 234, 0.8)' : 'rgba(147, 51, 234, 0.3)',
          borderColor: hasData ? 'rgb(147, 51, 234)' : 'rgba(147, 51, 234, 0.5)',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: hasData
          }
        },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: { stepSize: 10 }
          }
        }
      }
    });

    // Show message if no data
    if (!hasData) {
      const chartParent = ctx.parentElement;
      // Remove any existing overlay first
      const existingOverlay = chartParent.querySelector('.no-data-overlay');
      if (existingOverlay) existingOverlay.remove();
      
      if (!chartParent.querySelector('.no-data-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'no-data-overlay absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl z-10 pointer-events-none';
        overlay.innerHTML = `
          <div class="text-center p-6">
            <svg class="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-gray-600 font-medium">No focus session data yet</p>
            <p class="text-sm text-gray-400 mt-1">Start focus sessions to track your time</p>
          </div>
        `;
        if (chartParent.style.position !== 'relative' && chartParent.style.position !== 'absolute') {
          chartParent.style.position = 'relative';
        }
        chartParent.appendChild(overlay);
      }
    } else {
      const overlay = ctx.parentElement.querySelector('.no-data-overlay');
      if (overlay) overlay.remove();
    }
  }

  renderPriorityChart(tasks) {
    const ctx = document.getElementById('priorityChart');
    if (!ctx) return;

    if (this.charts.priority) {
      this.charts.priority.destroy();
    }

    const priorities = { High: 0, Medium: 0, Low: 0 };
    tasks.forEach(t => {
      const priority = t.priority || 'Medium';
      priorities[priority]++;
    });

    const hasData = tasks.length > 0;
    const displayData = hasData ? 
      [priorities.High, priorities.Medium, priorities.Low] : 
      [2, 5, 3];

    this.charts.priority = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['High Priority', 'Medium Priority', 'Low Priority'],
        datasets: [{
          data: displayData,
          backgroundColor: hasData ? [
            'rgba(239, 68, 68, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(34, 197, 94, 0.8)'
          ] : [
            'rgba(239, 68, 68, 0.3)',
            'rgba(251, 146, 60, 0.3)',
            'rgba(34, 197, 94, 0.3)'
          ],
          borderWidth: 3,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          },
          tooltip: {
            enabled: hasData
          }
        }
      }
    });

    // Show message if no data
    if (!hasData) {
      const chartParent = ctx.parentElement;
      // Remove any existing overlay first
      const existingOverlay = chartParent.querySelector('.no-data-overlay');
      if (existingOverlay) existingOverlay.remove();
      
      if (!chartParent.querySelector('.no-data-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'no-data-overlay absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl z-10 pointer-events-none';
        overlay.innerHTML = `
          <div class="text-center p-6">
            <svg class="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
            <p class="text-gray-600 font-medium">No priority data yet</p>
            <p class="text-sm text-gray-400 mt-1">Create tasks to see distribution</p>
          </div>
        `;
        if (chartParent.style.position !== 'relative' && chartParent.style.position !== 'absolute') {
          chartParent.style.position = 'relative';
        }
        chartParent.appendChild(overlay);
      }
    } else {
      const overlay = ctx.parentElement.querySelector('.no-data-overlay');
      if (overlay) overlay.remove();
    }
  }

  renderCategoryChart(tasks) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    if (this.charts.category) {
      this.charts.category.destroy();
    }

    const categories = {};
    tasks.forEach(t => {
      const category = t.list || 'Uncategorized';
      categories[category] = (categories[category] || 0) + 1;
    });

    const labels = Object.keys(categories).slice(0, 5);
    const data = Object.values(categories).slice(0, 5);

    const hasData = tasks.length > 0;
    const displayLabels = hasData && labels.length > 0 ? labels : ['Work', 'Personal', 'Study', 'Other'];
    const displayData = hasData && data.length > 0 ? data : [3, 5, 2, 2];

    this.charts.category = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: displayLabels,
        datasets: [{
          data: displayData,
          backgroundColor: hasData ? [
            'rgba(59, 130, 246, 0.7)',
            'rgba(147, 51, 234, 0.7)',
            'rgba(236, 72, 153, 0.7)',
            'rgba(34, 197, 94, 0.7)',
            'rgba(251, 146, 60, 0.7)'
          ] : [
            'rgba(59, 130, 246, 0.3)',
            'rgba(147, 51, 234, 0.3)',
            'rgba(236, 72, 153, 0.3)',
            'rgba(34, 197, 94, 0.3)'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          },
          tooltip: {
            enabled: hasData
          }
        }
      }
    });

    // Show message if no data
    if (!hasData) {
      const chartParent = ctx.parentElement;
      // Remove any existing overlay first
      const existingOverlay = chartParent.querySelector('.no-data-overlay');
      if (existingOverlay) existingOverlay.remove();
      
      if (!chartParent.querySelector('.no-data-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'no-data-overlay absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl z-10 pointer-events-none';
        overlay.innerHTML = `
          <div class="text-center p-6">
            <svg class="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p class="text-gray-600 font-medium">No category data yet</p>
            <p class="text-sm text-gray-400 mt-1">Organize tasks into lists to see breakdown</p>
          </div>
        `;
        if (chartParent.style.position !== 'relative' && chartParent.style.position !== 'absolute') {
          chartParent.style.position = 'relative';
        }
        chartParent.appendChild(overlay);
      }
    } else {
      const overlay = ctx.parentElement.querySelector('.no-data-overlay');
      if (overlay) overlay.remove();
    }
  }

  getDaysInRange(dateRange) {
    const days = [];
    const current = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days.slice(-14);
  }

  displayRecentActivity(tasks, focusSessions, dateRange) {
    const activityList = document.getElementById('activityList');
    const activityCount = document.getElementById('activityCount');
    
    // Filter by date range
    const filteredTasks = tasks.filter(t => {
      if (!t.createdAt) return false;
      const date = t.createdAt.toDate();
      return date >= dateRange.start && date <= dateRange.end;
    });
    
    const filteredSessions = focusSessions.filter(s => {
      if (!s.startTime && !s.createdAt) return false;
      const date = (s.startTime || s.createdAt).toDate();
      return date >= dateRange.start && date <= dateRange.end;
    });
    
    const activities = [];
    
    filteredTasks.filter(t => t.completed && t.completedAt).slice(0, 5).forEach(task => {
      activities.push({
        type: 'task',
        title: task.title,
        timestamp: task.completedAt?.toDate() || task.createdAt.toDate(),
        priority: task.priority || 'Medium',
        icon: '✅',
        color: 'green',
        bgColor: 'emerald'
      });
    });
    
    filteredSessions.slice(0, 5).forEach(session => {
      activities.push({
        type: 'focus',
        title: `Focus session: ${session.taskName || 'Untitled'}`,
        timestamp: (session.startTime || session.createdAt).toDate(),
        duration: Math.floor((session.timeSpent || 0) / 60),
        icon: '⏱️',
        color: 'purple',
        bgColor: 'purple'
      });
    });
    
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    if (activityCount) {
      activityCount.textContent = `${activities.length} item${activities.length !== 1 ? 's' : ''}`;
    }
    
    if (activities.length === 0) {
      activityList.innerHTML = `
        <div class="text-center py-12">
          <svg class="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p class="text-gray-500 text-lg font-medium">No recent activity</p>
          <p class="text-gray-400 text-sm mt-2">Complete tasks or start focus sessions to see them here</p>
        </div>
      `;
      return;
    }

    activityList.innerHTML = activities.slice(0, 10).map((activity, index) => {
      const timeAgo = this.getTimeAgo(activity.timestamp);
      const priorityColors = {
        High: 'bg-red-100 text-red-700',
        Medium: 'bg-yellow-100 text-yellow-700',
        Low: 'bg-green-100 text-green-700'
      };
      
      return `
        <div class="activity-card flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-${activity.color}-200 hover:shadow-md cursor-pointer" style="animation-delay: ${index * 0.1}s;">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-${activity.bgColor}-100 to-${activity.bgColor}-200 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            ${activity.icon}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="font-semibold text-gray-900 truncate">${activity.title}</div>
              ${activity.priority ? `<span class="text-xs px-2 py-1 rounded-lg ${priorityColors[activity.priority] || ''} whitespace-nowrap">${activity.priority}</span>` : ''}
            </div>
            <div class="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>${timeAgo}</span>
              ${activity.duration ? `
                <span class="flex items-center gap-1">
                  <span class="w-1 h-1 rounded-full bg-gray-400"></span>
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>${activity.duration} min</span>
                </span>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  generateInsights(tasks, focusSessions, dateRange) {
    const insightsList = document.getElementById('insightsList');
    
    // Filter by date range
    const filteredTasks = tasks.filter(t => {
      if (!t.createdAt) return false;
      const date = t.createdAt.toDate();
      return date >= dateRange.start && date <= dateRange.end;
    });
    
    const filteredSessions = focusSessions.filter(s => {
      if (!s.startTime && !s.createdAt) return false;
      const date = (s.startTime || s.createdAt).toDate();
      return date >= dateRange.start && date <= dateRange.end;
    });
    
    const insights = [];

    const completedTasks = filteredTasks.filter(t => t.completed || t.status === 'Done').length;
    const completionRate = filteredTasks.length > 0 ? (completedTasks / filteredTasks.length) * 100 : 0;

    if (completionRate > 80) {
      insights.push('🎉 Excellent! Your completion rate is over 80%. Keep up the great work!');
    } else if (completionRate > 50) {
      insights.push('👍 Good progress! You\'re completing more than half of your tasks.');
    } else if (filteredTasks.length > 0) {
      insights.push('💡 Try breaking down larger tasks into smaller, manageable steps to improve completion rate.');
    }

    const avgFocusTime = filteredSessions.length > 0 
      ? filteredSessions.reduce((acc, s) => acc + (s.timeSpent || 0), 0) / filteredSessions.length / 60
      : 0;

    if (avgFocusTime > 30) {
      insights.push('⭐ Your average focus session is over 30 minutes. Excellent concentration!');
    } else if (avgFocusTime > 0) {
      insights.push('⏰ Consider longer focus sessions (25-45 minutes) for better productivity.');
    }

    const highPriorityTasks = filteredTasks.filter(t => t.priority === 'High' && !t.completed).length;
    if (highPriorityTasks > 0) {
      insights.push(`🎯 You have ${highPriorityTasks} high-priority ${highPriorityTasks === 1 ? 'task' : 'tasks'} pending. Focus on these first!`);
    }

    if (filteredSessions.length > 0) {
      const completedSessions = filteredSessions.filter(s => s.completed).length;
      const sessionCompletionRate = (completedSessions / filteredSessions.length) * 100;
      if (sessionCompletionRate > 80) {
        insights.push('🏆 You\'re completing most of your focus sessions! Great discipline!');
      }
    }

    if (insights.length === 0) {
      insights.push({
        icon: '💪',
        title: 'Get Started',
        message: 'Start adding tasks and focus sessions to get personalized insights!'
      });
      insights.push({
        icon: '📊',
        title: 'Track Progress',
        message: 'Complete tasks to see your productivity trends and patterns.'
      });
      insights.push({
        icon: '🎯',
        title: 'Stay Focused',
        message: 'Use focus sessions to improve concentration and track deep work.'
      });
    } else {
      // Convert simple insights to structured format
      insights = insights.map(text => {
        const parts = text.split(' ', 1);
        const icon = parts[0];
        const message = text.substring(icon.length + 1);
        
        return {
          icon: icon,
          title: this.getInsightTitle(message),
          message: message
        };
      });
    }

    insightsList.innerHTML = insights.map((insight, index) => `
      <div class="insight-card flex items-start gap-4 bg-white/20 backdrop-blur-md rounded-2xl p-5 border border-white/30 hover:bg-white/30 transition-all cursor-pointer group">
        <div class="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform">
          ${insight.icon}
        </div>
        <div class="flex-1">
          <div class="font-bold text-lg mb-1 text-white">${insight.title}</div>
          <p class="text-white/90 text-sm leading-relaxed">${insight.message}</p>
        </div>
      </div>
    `).join('');
  }
  
  getInsightTitle(message) {
    if (message.includes('completion rate') && message.includes('80')) return 'Outstanding Performance';
    if (message.includes('completion rate') && message.includes('50')) return 'Good Progress';
    if (message.includes('breaking down')) return 'Improve Completion';
    if (message.includes('average focus') && message.includes('30')) return 'Excellent Focus';
    if (message.includes('longer focus')) return 'Optimize Focus Time';
    if (message.includes('high-priority')) return 'Priority Alert';
    if (message.includes('completing most')) return 'Great Discipline';
    return 'Productivity Tip';
  }

  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    
    return 'Just now';
  }
}

// Logout function
window.logout = async function() {
  try {
    await auth.signOut();
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Reports();
  });
} else {
  new Reports();
}
