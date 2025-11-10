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

      const dateRange = this.getDateRange(this.currentPeriod);
      
      const [tasks, focusSessions] = await Promise.all([
        this.loadTasks(this.user.uid, dateRange),
        this.loadFocusSessions(this.user.uid, dateRange)
      ]);

      this.displayStats(tasks, focusSessions);
      this.renderCharts(tasks, focusSessions, dateRange);
      this.displayRecentActivity(tasks, focusSessions);
      this.generateInsights(tasks, focusSessions);
      
    } catch (error) {
      console.error('Error loading reports:', error);
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
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', userId),
        where('createdAt', '>=', Timestamp.fromDate(dateRange.start))
      );

      const snapshot = await getDocs(tasksQuery);
      const tasks = [];
      
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });

      return tasks;
    } catch (error) {
      console.error('Error loading tasks:', error);
      return [];
    }
  }

  async loadFocusSessions(userId, dateRange) {
    try {
      const sessionsQuery = query(
        collection(db, 'focusSessions'),
        where('userId', '==', userId),
        where('createdAt', '>=', Timestamp.fromDate(dateRange.start)),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(sessionsQuery);
      const sessions = [];
      
      snapshot.forEach(doc => {
        sessions.push({ id: doc.id, ...doc.data() });
      });

      return sessions;
    } catch (error) {
      console.error('Error loading focus sessions:', error);
      return [];
    }
  }

  displayStats(tasks, focusSessions) {
    const completedTasks = tasks.filter(t => t.completed).length;
    const totalFocusTime = focusSessions.reduce((acc, s) => acc + (s.timeSpent || 0), 0);
    const hours = Math.floor(totalFocusTime / 3600);
    const minutes = Math.floor((totalFocusTime % 3600) / 60);
    
    const completionRate = tasks.length > 0 
      ? Math.round((completedTasks / tasks.length) * 100) 
      : 0;
    
    const productivityScore = this.calculateProductivityScore(tasks, focusSessions);

    document.getElementById('totalCompleted').textContent = completedTasks;
    document.getElementById('totalFocusTime').textContent = `${hours}h ${minutes}m`;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
    document.getElementById('productivityScore').textContent = productivityScore;
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

    this.charts.completionTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Tasks Completed',
          data: completionData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
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

    this.charts.focusSessions = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days.map(d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
        datasets: [{
          label: 'Focus Time (minutes)',
          data: sessionData,
          backgroundColor: 'rgba(147, 51, 234, 0.8)',
          borderColor: 'rgb(147, 51, 234)',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { 
            beginAtZero: true,
            ticks: { stepSize: 10 }
          }
        }
      }
    });
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

    this.charts.priority = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['High Priority', 'Medium Priority', 'Low Priority'],
        datasets: [{
          data: [priorities.High, priorities.Medium, priorities.Low],
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(34, 197, 94, 0.8)'
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
          }
        }
      }
    });
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

    this.charts.category = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            'rgba(59, 130, 246, 0.7)',
            'rgba(147, 51, 234, 0.7)',
            'rgba(236, 72, 153, 0.7)',
            'rgba(34, 197, 94, 0.7)',
            'rgba(251, 146, 60, 0.7)'
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
          }
        }
      }
    });
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

  displayRecentActivity(tasks, focusSessions) {
    const activityList = document.getElementById('activityList');
    
    const activities = [];
    
    tasks.filter(t => t.completed && t.completedAt).slice(0, 5).forEach(task => {
      activities.push({
        type: 'task',
        title: task.title,
        timestamp: task.completedAt?.toDate() || task.createdAt.toDate(),
        icon: '✅',
        color: 'green'
      });
    });
    
    focusSessions.slice(0, 5).forEach(session => {
      activities.push({
        type: 'focus',
        title: `Focus session: ${session.taskName}`,
        timestamp: session.startTime.toDate(),
        duration: Math.floor((session.timeSpent || 0) / 60),
        icon: '⏱️',
        color: 'purple'
      });
    });
    
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    if (activities.length === 0) {
      activityList.innerHTML = '<p class="text-gray-500 text-center py-8">No recent activity</p>';
      return;
    }

    activityList.innerHTML = activities.slice(0, 10).map(activity => {
      const timeAgo = this.getTimeAgo(activity.timestamp);
      return `
        <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
          <div class="w-10 h-10 rounded-lg bg-${activity.color}-100 flex items-center justify-center text-xl flex-shrink-0">
            ${activity.icon}
          </div>
          <div class="flex-1">
            <div class="font-semibold text-gray-900">${activity.title}</div>
            <div class="text-sm text-gray-600 mt-1">
              ${timeAgo}
              ${activity.duration ? ` • ${activity.duration} minutes` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  generateInsights(tasks, focusSessions) {
    const insightsList = document.getElementById('insightsList');
    const insights = [];

    const completedTasks = tasks.filter(t => t.completed).length;
    const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    if (completionRate > 80) {
      insights.push('🎉 Excellent! Your completion rate is over 80%. Keep up the great work!');
    } else if (completionRate > 50) {
      insights.push('👍 Good progress! You\'re completing more than half of your tasks.');
    } else if (tasks.length > 0) {
      insights.push('💡 Try breaking down larger tasks into smaller, manageable steps to improve completion rate.');
    }

    const avgFocusTime = focusSessions.length > 0 
      ? focusSessions.reduce((acc, s) => acc + (s.timeSpent || 0), 0) / focusSessions.length / 60
      : 0;

    if (avgFocusTime > 30) {
      insights.push('⭐ Your average focus session is over 30 minutes. Excellent concentration!');
    } else if (avgFocusTime > 0) {
      insights.push('⏰ Consider longer focus sessions (25-45 minutes) for better productivity.');
    }

    const highPriorityTasks = tasks.filter(t => t.priority === 'High' && !t.completed).length;
    if (highPriorityTasks > 0) {
      insights.push(`🎯 You have ${highPriorityTasks} high-priority ${highPriorityTasks === 1 ? 'task' : 'tasks'} pending. Focus on these first!`);
    }

    if (focusSessions.length > 0) {
      const completedSessions = focusSessions.filter(s => s.completed).length;
      const sessionCompletionRate = (completedSessions / focusSessions.length) * 100;
      if (sessionCompletionRate > 80) {
        insights.push('🏆 You\'re completing most of your focus sessions! Great discipline!');
      }
    }

    if (insights.length === 0) {
      insights.push('💪 Start adding tasks and focus sessions to get personalized insights!');
    }

    insightsList.innerHTML = insights.map(insight => `
      <div class="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
        <div class="text-xl">💡</div>
        <p class="flex-1">${insight}</p>
      </div>
    `).join('');
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
