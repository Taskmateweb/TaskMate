// src/js/app.js
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { tasksService, listsService } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log('TaskMate app.js loaded');

  // --- CHECK AUTHENTICATION ---
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Update user name in greeting
    const userNameEl = document.getElementById('userName');
    if (userNameEl && user.displayName) {
      userNameEl.textContent = user.displayName.split(' ')[0]; // First name only
    }

    // Update profile email with real user email
    const profileEmailEl = document.getElementById('profileEmail');
    if (profileEmailEl && user.email) {
      profileEmailEl.textContent = user.email;
    }

    // Initialize app with Firebase data
    await initializeApp();
  });

  // Migrate old completed tasks that don't have completedAt timestamp
  async function migrateOldCompletedTasks(tasks) {
    try {
      const tasksToUpdate = tasks.filter(task => 
        (task.status === 'Done' || task.completed === true) && !task.completedAt
      );
      
      if (tasksToUpdate.length > 0) {
        console.log(`Migrating ${tasksToUpdate.length} old completed tasks...`);
        
        for (const task of tasksToUpdate) {
          try {
            // Use createdAt as a fallback for completedAt, or current time
            const completedTime = task.createdAt || Timestamp.now();
            
            await tasksService.updateTask(task.id, {
              completed: true,
              completedAt: completedTime
            });
            
            task.completed = true;
            task.completedAt = completedTime;
          } catch (err) {
            console.error(`Error migrating task ${task.id}:`, err);
          }
        }
        
        console.log('Migration complete!');
      }
    } catch (error) {
      console.error('Error during migration:', error);
    }
  }

  async function initializeApp() {
    // --- LOAD DATA FROM FIREBASE ---
    let tasks = [];
    let lists = [];

    try {
      tasks = await tasksService.getAllTasks();
      lists = await listsService.getAllLists();
      
      // Migrate old completed tasks to add completedAt timestamp
      await migrateOldCompletedTasks(tasks);
    } catch (error) {
      console.error('Error loading data:', error);
      tasks = [];
      lists = ["Personal","Work","Shopping","Ideas","Travel","Movies","Books","Music",
        "Fitness","Finance","Home","Projects","Events","Goals","Habits","Routines"];
    }

    // --- Short helpers to get DOM nodes ---
  const $ = id => document.getElementById(id);
  const tasksContainer = $('tasksContainer');
  const emptyState = $('emptyState');
  const listContainer = $('listContainer');
  const addTaskBtn = $('addTaskBtn');
  const addTaskModal = $('addTaskModal');
  const addTaskContent = $('addTaskContent');
  const cancelAddTask = $('cancelAddTask');
  const addTaskForm = $('addTaskForm');
  const newTaskTitle = $('newTaskTitle');
  const newTaskListSelect = $('newTaskListSelect');
  const newTaskListOther = $('newTaskListOther');
  const newTaskDue = $('newTaskDue');
  const newTaskPriority = $('newTaskPriority');
  const newTaskDescription = $('newTaskDescription');

  const totalTasksEl = $('totalTasks');
  const inProgressTasksEl = $('inProgressTasks');
  const completedTasksEl = $('completedTasks');

  const editModal = $('editModal'); // used by existing edit flow
  const focusCard = $('focusCard');
  const focusModal = $('focusModal');
  const focusTaskSelect = $('focusTaskSelect');
  const focusMinutes = $('focusMinutes');
  const focusTimerDisplay = $('focusTimerDisplay');
  const startFocusBtn = $('startFocusBtn');
  const stopFocusBtn = $('stopFocusBtn');
  const closeFocusModal = $('closeFocusModal');

  const taskDetailsModal = $('taskDetailsModal');
  const detailTitle = $('detailTitle');
  const detailDesc = $('detailDesc');
  const detailList = $('detailList');
  const detailDue = $('detailDue');
  const detailPriority = $('detailPriority');
  const detailStatus = $('detailStatus');
  const closeDetail = $('closeDetail');

  const sortSelect = $('sortSelect');
  const topSearch = $('topSearch');

  const profileBtn = $('profileBtn');
  const profileMenu = $('profileMenu');
  const profileWrap = $('profileWrap');
  const logoutBtn = $('logoutBtn');

  // timer variables for focus
  let timerInterval = null;
  let timerRemaining = 0;

  // Save state to Firebase
  async function saveAll() {
    // Firebase auto-saves on create/update/delete, no need for manual save
    console.log('Data synced with Firebase');
  }

  // Update stats
  function updateStats() {
    if (totalTasksEl) totalTasksEl.textContent = tasks.length;
    if (inProgressTasksEl) inProgressTasksEl.textContent = tasks.filter(t => t.status === 'In Progress').length;
    if (completedTasksEl) completedTasksEl.textContent = tasks.filter(t => t.status === 'Done').length;
  }



  // --- Render lists in sidebar & populate addTask select ---
  function renderLists() {
    if (!listContainer) return;
    listContainer.innerHTML = '';
    lists.forEach(name => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between';
      li.innerHTML = `
        <button class="text-left w-full text-sm py-2 px-3 rounded-xl hover:bg-primary-50 hover:text-primary-700 transition-colors flex items-center gap-2 font-medium text-gray-700" data-list="${name}">
          <span class="w-2 h-2 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500"></span>
          ${escapeHtml(name)}
        </button>
      `;
      listContainer.appendChild(li);
    });

    // click handlers for list filtering
    listContainer.querySelectorAll('button[data-list]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chosen = e.currentTarget.dataset.list;
        filterByList(chosen);
        // Highlight active list
        listContainer.querySelectorAll('button').forEach(b => {
          b.classList.remove('bg-primary-50', 'text-primary-700');
        });
        e.currentTarget.classList.add('bg-primary-50', 'text-primary-700');
      });
    });

    populateListSelect();
  }

  function populateListSelect() {
    if (!newTaskListSelect) return;
    newTaskListSelect.innerHTML = '';
    lists.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l;
      opt.textContent = l;
      newTaskListSelect.appendChild(opt);
    });
    // add separator-ish option `Other`
    const otherOpt = document.createElement('option');
    otherOpt.value = '__other__';
    otherOpt.textContent = 'Other (create new)';
    newTaskListSelect.appendChild(otherOpt);
  }

  // --- Render tasks table ---
  function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function priorityClass(p){
    if (p === 'High') return 'bg-red-100 text-red-700';
    if (p === 'Medium') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  }

  function statusClass(s){
    if (s === 'To Do') return 'border-gray-200 text-gray-700 bg-white';
    if (s === 'In Progress') return 'border-blue-100 text-blue-700 bg-blue-50';
    return 'border-green-100 text-green-700 bg-green-50';
  }

  function renderTasks(filterList = null, query = '') {
    if (!tasksContainer) return;
    let items = tasks.slice();

    if (filterList) items = items.filter(t => t.list === filterList);
    if (query) items = items.filter(t => (t.title + ' ' + t.list + ' ' + t.due + ' ' + (t.description||'')).toLowerCase().includes(query.toLowerCase()));

    // basic priority sort if chosen
    const sort = (sortSelect && sortSelect.value) || 'default';
    if (sort.includes('priority')) {
      const map = { 'Low':1, 'Medium':2, 'High':3 };
      items.sort((a,b) => sort === 'priority-asc' ? map[a.priority]-map[b.priority] : map[b.priority]-map[a.priority]);
    }

    // Show/hide empty state
    if (emptyState) {
      emptyState.classList.toggle('hidden', items.length > 0);
    }

    tasksContainer.innerHTML = '';
    items.forEach(task => {
      // Create modern task card
      const card = document.createElement('div');
      card.className = 'task-card bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer';
      card.dataset.id = task.id;
      card.title = 'Double-click to view full details';

      // Priority badge colors
      const priorityColors = {
        'High': 'bg-red-100 text-red-700 border-red-200',
        'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'Low': 'bg-green-100 text-green-700 border-green-200'
      };

      // Status colors and next status
      const statusInfo = {
        'To Do': { 
          color: 'bg-gray-100 text-gray-700 border-gray-300',
          next: 'In Progress',
          icon: '○'
        },
        'In Progress': { 
          color: 'bg-blue-100 text-blue-700 border-blue-300',
          next: 'Done',
          icon: '◐'
        },
        'Done': { 
          color: 'bg-green-100 text-green-700 border-green-300',
          next: 'To Do',
          icon: '✓'
        }
      };

      const currentStatus = statusInfo[task.status] || statusInfo['To Do'];
      const isDone = task.status === 'Done';

      card.innerHTML = `
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <h4 class="text-base font-semibold text-gray-900 ${isDone ? 'line-through opacity-60' : ''}">${escapeHtml(task.title)}</h4>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityColors[task.priority] || priorityColors['Medium']}">
                ${escapeHtml(task.priority)}
              </span>
            </div>
            
            ${task.description ? `<p class="text-sm text-gray-600 mb-3 ${isDone ? 'opacity-60' : ''}">${escapeHtml(task.description)}</p>` : ''}
            
            <div class="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <div class="flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
                <span>${escapeHtml(task.list)}</span>
              </div>
              
              ${task.due ? `
                <div class="flex items-center gap-1.5">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  <span>${escapeHtml(task.due)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="flex flex-col items-end gap-2 flex-shrink-0">
            <!-- Status Update Button -->
            <button class="statusUpdateBtn inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${currentStatus.color} hover:shadow-md"
                    data-id="${task.id}"
                    title="Click to update status to ${currentStatus.next}">
              <span>${currentStatus.icon}</span>
              <span>${escapeHtml(task.status)}</span>
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>

            <!-- Actions Menu -->
            <div class="relative">
              <button class="task-more-btn p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" data-id="${task.id}">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
              </button>
              <div class="task-options hidden absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden">
                <button class="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm editBtn" data-id="${task.id}">
                  <svg class="w-4 h-4 inline mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  Edit
                </button>
                <button class="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm viewDescBtn" data-id="${task.id}">
                  <svg class="w-4 h-4 inline mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  View Details
                </button>
                <button class="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors text-sm text-red-600 deleteBtn border-t border-gray-100" data-id="${task.id}">
                  <svg class="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      tasksContainer.appendChild(card);
    });

    updateStats();
  }

  // --- Filter by list helper ---
  function filterByList(listName) {
    renderTasks(listName, topSearch ? topSearch.value : '');
  }

  // --- Save when tasks or lists change (Firebase auto-saves) ---
  async function persist() {
    // Firebase automatically saves on create/update/delete
    console.log('Changes synced with Firebase');
  }

  // --- Add Task modal open/close with smooth animation ---
  function openAddTaskModal() {
    if (!addTaskModal || !addTaskContent) return;
    addTaskModal.classList.remove('hidden');
    // small timeout to allow transition
    setTimeout(() => {
      addTaskContent.classList.remove('scale-95','opacity-0');
      addTaskContent.classList.add('scale-100','opacity-100');
    }, 20);
  }
  function closeAddTaskModal() {
    if (!addTaskModal || !addTaskContent) return;
    addTaskContent.classList.remove('scale-100','opacity-100');
    addTaskContent.classList.add('scale-95','opacity-0');
    setTimeout(() => addTaskModal.classList.add('hidden'), 180);
  }

  // --- Add Task form handler ---
  if (addTaskBtn) addTaskBtn.addEventListener('click', () => {
    openAddTaskModal();
    // reset fields and default state
    if (newTaskListSelect) newTaskListSelect.value = lists[0] || '';
    if (newTaskListOther) { newTaskListOther.value = ''; newTaskListOther.classList.add('hidden'); }
  });

  if (cancelAddTask) cancelAddTask.addEventListener('click', closeAddTaskModal);
  if (addTaskModal) addTaskModal.addEventListener('click', (e) => { if (e.target === addTaskModal) closeAddTaskModal(); });

  // handle select -> show Other input
  if (newTaskListSelect && newTaskListOther) {
    newTaskListSelect.addEventListener('change', (e) => {
      if (e.target.value === '__other__') {
        newTaskListOther.classList.remove('hidden');
        newTaskListOther.focus();
      } else {
        newTaskListOther.classList.add('hidden');
      }
    });
  }

  if (addTaskForm) {
    addTaskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (newTaskTitle && newTaskTitle.value.trim()) || 'Untitled';
      let list = newTaskListSelect ? newTaskListSelect.value : (newTaskListOther ? newTaskListOther.value.trim() : 'General');
      if (list === '__other__') list = (newTaskListOther && newTaskListOther.value.trim()) || 'Others';

      const due = (newTaskDue && newTaskDue.value) || '';
      const priority = (newTaskPriority && newTaskPriority.value) || 'Medium';
      const description = (newTaskDescription && newTaskDescription.value.trim()) || '';

      // If new list entered and not already exist, add to lists
      if (list && !lists.includes(list)) {
        lists.unshift(list);
        try {
          await listsService.addList(list);
        } catch (error) {
          console.error('Error adding list:', error);
        }
        populateListSelect();
        renderLists();
      }

      try {
        const newTask = await tasksService.addTask({ 
          title, 
          list, 
          due, 
          priority, 
          status: 'To Do', 
          description 
        });
        tasks.unshift(newTask);
        renderTasks();
        closeAddTaskModal();
        addTaskForm.reset();
        console.log('Task added:', newTask);
      } catch (error) {
        console.error('Error adding task:', error);
        alert('Failed to add task. Please try again.');
      }
    });
  }

  // --- Delegated task table interactions ---
  if (tasksContainer) {
    // Add double-click event to show task details
    tasksContainer.addEventListener('dblclick', (e) => {
      const card = e.target.closest('.task-card');
      if (card && card.dataset.id) {
        openTaskDetailsById(card.dataset.id);
      }
    });

    tasksContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.task-card');
      const idAttr = card && card.dataset && card.dataset.id ? card.dataset.id : null;

      // If clicked on statusUpdateBtn
      const statusBtn = e.target.closest('.statusUpdateBtn');
      if (statusBtn) {
        const id = statusBtn.dataset.id;
        toggleStatus(id);
        return;
      }

      // task-more button toggle
      const moreBtn = e.target.closest('.task-more-btn');
      if (moreBtn) {
        e.stopPropagation();
        const container = moreBtn.parentElement;
        const pane = container && container.querySelector('.task-options');
        if (!pane) return;
        document.querySelectorAll('.task-options').forEach(p => { if (p !== pane) p.classList.add('hidden'); });
        pane.classList.toggle('hidden');
        return;
      }

      // edit
      const editBtn = e.target.closest('.editBtn');
      if (editBtn) {
        const id = editBtn.dataset.id;
        openEditModal(id);
        return;
      }

      // view details (from options)
      const viewDescBtn = e.target.closest('.viewDescBtn');
      if (viewDescBtn) {
        const id = viewDescBtn.dataset.id;
        openTaskDetailsById(id);
        return;
      }

      // delete
      const deleteBtn = e.target.closest('.deleteBtn');
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        deleteTask(id);
        return;
      }

      // If clicked a card (not on a control), could open details
      // Commenting out to avoid accidental clicks
      // if (card && idAttr && !e.target.closest('button') && !e.target.closest('.task-options')) {
      //   openTaskDetailsById(idAttr);
      //   return;
      // }
    });

    // close any open task-options when clicking outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.task-options').forEach(p => p.classList.add('hidden'));
    });
  }

  // --- Task actions ---
  async function toggleStatus(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    const newStatus = t.status === 'To Do' ? 'In Progress' : t.status === 'In Progress' ? 'Done' : 'To Do';
    
    try {
      const updateData = { status: newStatus };
      
      // If marking as Done, add completion tracking
      if (newStatus === 'Done') {
        updateData.completed = true;
        updateData.completedAt = Timestamp.now();
      } else {
        // If changing from Done to another status, remove completion tracking
        updateData.completed = false;
        updateData.completedAt = null;
      }
      
      await tasksService.updateTask(id, updateData);
      t.status = newStatus;
      t.completed = updateData.completed;
      t.completedAt = updateData.completedAt;
      
      // Show congratulations when marking as Done
      if (newStatus === 'Done') {
        showCongrats();
      }
      
      renderTasks();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update task status');
    }
  }

  async function markComplete(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    
    try {
      await tasksService.updateTask(id, { 
        status: 'Done',
        completed: true,
        completedAt: Timestamp.now()
      });
      t.status = 'Done';
      t.completed = true;
      t.completedAt = Timestamp.now();
      
      // Show congratulations
      showCongrats();
      
      renderTasks();
    } catch (error) {
      console.error('Error marking complete:', error);
      alert('Failed to mark task as complete');
    }
  }

  async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await tasksService.deleteTask(id);
      tasks = tasks.filter(x => x.id !== id);
      renderTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  }

  // --- Edit modal behaviour (reuse existing edit modal) ---
  const editForm = $('editForm');
  const editTaskId = $('editTaskId');
  const editTitle = $('editTitle');
  const editList = $('editList');
  const editDue = $('editDue');
  const editPriority = $('editPriority');
  const closeEditModal = $('closeEditModal');

  function openEditModal(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    if (editTaskId) editTaskId.value = t.id;
    if (editTitle) editTitle.value = t.title;
    if (editList) editList.value = t.list;
    if (editDue) editDue.value = t.due;
    if (editPriority) editPriority.value = t.priority;
    if (editModal) {
      editModal.classList.remove('hidden');
      editModal.classList.add('flex', 'items-center', 'justify-center');
    }
  }
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editTaskId.value; // Keep as string since Firestore IDs are strings
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      
      const updates = {
        title: editTitle.value.trim(),
        list: editList.value.trim() || t.list,
        due: editDue.value.trim() || t.due,
        priority: editPriority.value
      };
      
      try {
        await tasksService.updateTask(id, updates);
        Object.assign(t, updates);
        renderTasks();
        if (editModal) { editModal.classList.add('hidden'); editModal.classList.remove('flex'); }
      } catch (error) {
        console.error('Error updating task:', error);
        alert('Failed to update task');
      }
    });
  }
  if (closeEditModal) closeEditModal.addEventListener('click', () => { if (editModal) { editModal.classList.add('hidden'); editModal.classList.remove('flex'); } });

  // --- Task Details modal ---
  function openTaskDetailsById(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    detailTitle.textContent = t.title;
    detailDesc.textContent = t.description || '(No description)';
    detailList.textContent = t.list || '—';
    detailDue.textContent = t.due || '—';
    detailPriority.textContent = t.priority || '—';
    detailStatus.textContent = t.status || '—';
    taskDetailsModal.classList.remove('hidden');
  }
  if (closeDetail) closeDetail.addEventListener('click', () => taskDetailsModal.classList.add('hidden'));
  if (taskDetailsModal) taskDetailsModal.addEventListener('click', (e) => { if (e.target === taskDetailsModal) taskDetailsModal.classList.add('hidden'); });

  // --- Focus modal handling (small) ---
  function renderFocusTaskOptions() {
    if (!focusTaskSelect) return;
    focusTaskSelect.innerHTML = tasks.map(t => `<option value="${t.id}">${escapeHtml(t.title)} — ${escapeHtml(t.list)}</option>`).join('');
  }
  if (focusCard && focusModal) {
    focusCard.addEventListener('click', () => {
      focusModal.classList.remove('hidden');
      focusModal.classList.add('flex','items-center','justify-center');
      renderFocusTaskOptions();
    });
  }
  if (closeFocusModal) closeFocusModal.addEventListener('click', () => { focusModal.classList.add('hidden'); focusModal.classList.remove('flex'); stopTimer(); });

  if (startFocusBtn) {
    startFocusBtn.addEventListener('click', () => {
      const minutes = Math.max(1, Number(focusMinutes && focusMinutes.value) || 25);
      startTimer(minutes * 60);
      startFocusBtn.classList.add('hidden');
      stopFocusBtn.classList.remove('hidden');
    });
  }
  if (stopFocusBtn) stopFocusBtn.addEventListener('click', () => { stopTimer(); startFocusBtn.classList.remove('hidden'); stopFocusBtn.classList.add('hidden'); });

  function startTimer(seconds) {
    timerRemaining = seconds;
    updateTimerDisplay(timerRemaining);
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timerRemaining--;
      updateTimerDisplay(timerRemaining);
      if (timerRemaining <= 0) { clearInterval(timerInterval); focusTimerDisplay.textContent = 'Completed!'; }
    }, 1000);
  }
  function stopTimer() { clearInterval(timerInterval); timerRemaining = 0; updateTimerDisplay(0); }
  function updateTimerDisplay(sec) {
    if (!focusTimerDisplay) return;
    if (sec <= 0) { focusTimerDisplay.textContent = '00:00'; return; }
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = (sec%60).toString().padStart(2,'0');
    focusTimerDisplay.textContent = `${m}:${s}`;
  }

  // --- Profile dropdown (modern) ---
  function openProfileMenu(){
    if(!profileMenu || !profileBtn) return;
    profileMenu.classList.remove('opacity-0','scale-95','pointer-events-none','hidden');
    profileMenu.classList.add('opacity-100','scale-100','pointer-events-auto');
    profileMenu.setAttribute('aria-hidden','false');
    profileBtn.setAttribute('aria-expanded','true');
  }
  function closeProfileMenu(){
    if(!profileMenu || !profileBtn) return;
    profileMenu.classList.remove('opacity-100','scale-100','pointer-events-auto');
    profileMenu.classList.add('opacity-0','scale-95','pointer-events-none');
    profileMenu.setAttribute('aria-hidden','true');
    profileBtn.setAttribute('aria-expanded','false');
  }
  if(profileBtn && profileMenu && profileWrap){
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = profileMenu.classList.contains('opacity-100');
      if(isOpen) closeProfileMenu(); else openProfileMenu();
    });

    document.addEventListener('click', (e) => { if(!profileWrap.contains(e.target)) closeProfileMenu(); });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeProfileMenu(); });
  }


if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

  // --- Search & sort listeners ---
  if (topSearch) topSearch.addEventListener('input', () => renderTasks(null, topSearch.value));
  if (sortSelect) sortSelect.addEventListener('change', () => renderTasks(null, topSearch.value));


  // Logout button click redirect


  // --- Initialize UI ---
  renderLists();
  renderTasks();

  // --- Helper: Escape HTML reused above (also used in focus select) ---
  function escapeHtml (s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  } // End of initializeApp function
});
