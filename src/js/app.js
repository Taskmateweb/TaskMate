// src/js/app.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('TaskMate app.js loaded');

  // --- STORAGE KEYS ---
  const TASKS_KEY = 'taskmate_tasks_v1';
  const LISTS_KEY = 'taskmate_lists_v1';

  // --- Default sample data (used only if no localStorage) ---
  const sampleTasks = [
    { id: 1, title: "Grocery Shopping", list: "Shopping", due: "Tomorrow", priority: "High", status: "To Do", description: "Buy milk, eggs, bread." },
    { id: 2, title: "Project Proposal", list: "Work", due: "Next Week", priority: "Medium", status: "In Progress", description: "Outline milestones and deliverables." },
    { id: 3, title: "Book Appointment", list: "Personal", due: "Today", priority: "High", status: "To Do", description: "Call clinic for appointment." }
  ];
  const sampleLists = ["Personal","Work","Shopping","Ideas","Travel","Movies","Books","Music",
    "Fitness","Finance","Home","Projects","Events","Goals","Habits","Routines"
];

  // --- State (load from localStorage if present) ---
  let tasks = loadFromStorage(TASKS_KEY) || sampleTasks.slice();
  let lists = loadFromStorage(LISTS_KEY) || sampleLists.slice();

  // --- Short helpers to get DOM nodes ---
  const $ = id => document.getElementById(id);
  const tasksTbody = $('tasksTbody');
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

  // --- Helpers: storage ---
  function saveToStorage(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e){ console.warn('Storage error', e); }
  }
  function loadFromStorage(key) {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : null;
    } catch(e) {
      console.warn('Storage parse error', e);
      return null;
    }
  }

  // Save state convenience
  function saveAll() {
    saveToStorage(TASKS_KEY, tasks);
    saveToStorage(LISTS_KEY, lists);
  }



  // --- Render lists in sidebar & populate addTask select ---
  function renderLists() {
    if (!listContainer) return;
    listContainer.innerHTML = '';
    lists.forEach(name => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between';
      li.innerHTML = `
        <button class="text-left w-full text-sm py-1 px-2 rounded hover:bg-gray-100" data-list="${name}">${escapeHtml(name)}</button>
      `;
      listContainer.appendChild(li);
    });

    // click handlers for list filtering
    listContainer.querySelectorAll('button[data-list]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chosen = e.currentTarget.dataset.list;
        filterByList(chosen);
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
    if (!tasksTbody) return;
    let items = tasks.slice();

    if (filterList) items = items.filter(t => t.list === filterList);
    if (query) items = items.filter(t => (t.title + ' ' + t.list + ' ' + t.due + ' ' + (t.description||'')).toLowerCase().includes(query.toLowerCase()));

    // basic priority sort if chosen
    const sort = (sortSelect && sortSelect.value) || 'default';
    if (sort.includes('priority')) {
      const map = { 'Low':1, 'Medium':2, 'High':3 };
      items.sort((a,b) => sort === 'priority-asc' ? map[a.priority]-map[b.priority] : map[b.priority]-map[a.priority]);
    }

    tasksTbody.innerHTML = '';
    items.forEach(task => {
      // row
      const tr = document.createElement('tr');
      tr.className = 'group hover:bg-gray-50 transition';
      tr.dataset.id = task.id;

      // title cell with strike-through if done
      const titleCls = task.status === 'Done' ? 'py-3 px-3 line-through opacity-60' : 'py-3 px-3';
      tr.innerHTML = `
        <td class="${titleCls}">${escapeHtml(task.title)}</td>
        <td class="py-3 px-3 text-sm text-gray-500">${escapeHtml(task.list)}</td>
        <td class="py-3 px-3 text-sm text-gray-500">${escapeHtml(task.due)}</td>
        <td class="py-3 px-3 text-sm"><span class="inline-block px-3 py-1 rounded-full text-xs ${priorityClass(task.priority)}">${escapeHtml(task.priority)}</span></td>
        <td class="py-3 px-3 text-sm"><button class="statusBtn inline-flex items-center px-3 py-1 rounded-full text-xs border ${statusClass(task.status)}" data-id="${task.id}">${escapeHtml(task.status)}</button></td>
        <td class="py-3 px-3 text-right">
          <div class="relative inline-block">
            <button class="task-more-btn text-gray-500 hover:text-gray-700" data-id="${task.id}">⋮</button>
            <div class="task-options hidden absolute right-0 mt-2 w-40 bg-white border rounded-md shadow-lg z-40">
              <button class="w-full text-left px-3 py-2 editBtn" data-id="${task.id}">Edit</button>
              <button class="w-full text-left px-3 py-2 markCompleteBtn" data-id="${task.id}">Mark Complete</button>
              <button class="w-full text-left px-3 py-2 viewDescBtn" data-id="${task.id}">View Details</button>
              <button class="w-full text-left px-3 py-2 deleteBtn text-red-600" data-id="${task.id}">Delete</button>
            </div>
          </div>
        </td>
      `;

      tasksTbody.appendChild(tr);
    });
  }

  // --- Filter by list helper ---
  function filterByList(listName) {
    renderTasks(listName, topSearch ? topSearch.value : '');
  }

  // --- Save when tasks or lists change ---
  function persist() {
    saveToStorage(TASKS_KEY, tasks);
    saveToStorage(LISTS_KEY, lists);
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
    addTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = (newTaskTitle && newTaskTitle.value.trim()) || 'Untitled';
      let list = newTaskListSelect ? newTaskListSelect.value : (newTaskListOther ? newTaskListOther.value.trim() : 'General');
      if (list === '__other__') list = (newTaskListOther && newTaskListOther.value.trim()) || 'Others';

      const due = (newTaskDue && newTaskDue.value) || '';
      const priority = (newTaskPriority && newTaskPriority.value) || 'Medium';
      const description = (newTaskDescription && newTaskDescription.value.trim()) || '';

      // If new list entered and not already exist, add to lists and persist
      if (list && !lists.includes(list)) {
        lists.unshift(list);
        saveToStorage(LISTS_KEY, lists);
        populateListSelect();
        renderLists();
      }

      const newTask = { id: Date.now(), title, list, due, priority, status: 'To Do', description };
      tasks.unshift(newTask);
      saveToStorage(TASKS_KEY, tasks);
      renderTasks();
      closeAddTaskModal();
      addTaskForm.reset();
      console.log('Task added:', newTask);
    });
  }

  // --- Delegated task table interactions ---
  if (tasksTbody) {
    tasksTbody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr');
      const idAttr = tr && tr.dataset && tr.dataset.id ? Number(tr.dataset.id) : null;

      // If clicked on statusBtn
      const statusBtn = e.target.closest('.statusBtn');
      if (statusBtn) {
        const id = Number(statusBtn.dataset.id);
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
        const id = Number(editBtn.dataset.id);
        openEditModal(id);
        return;
      }

      // mark complete
      const markCompleteBtn = e.target.closest('.markCompleteBtn');
      if (markCompleteBtn) {
        const id = Number(markCompleteBtn.dataset.id);
        markComplete(id);
        return;
      }

      // view details (from options)
      const viewDescBtn = e.target.closest('.viewDescBtn');
      if (viewDescBtn) {
        const id = Number(viewDescBtn.dataset.id);
        openTaskDetailsById(id);
        return;
      }

      // delete
      const deleteBtn = e.target.closest('.deleteBtn');
      if (deleteBtn) {
        const id = Number(deleteBtn.dataset.id);
        deleteTask(id);
        return;
      }

      // If clicked a row (not on a control), open details
      if (tr && idAttr && !e.target.closest('button') && !e.target.closest('.task-options')) {
        openTaskDetailsById(idAttr);
        return;
      }
    });

    // close any open task-options when clicking outside
    document.addEventListener('click', () => {
      document.querySelectorAll('.task-options').forEach(p => p.classList.add('hidden'));
    });
  }

  // --- Task actions ---
  function toggleStatus(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.status = t.status === 'To Do' ? 'In Progress' : t.status === 'In Progress' ? 'Done' : 'To Do';
    saveToStorage(TASKS_KEY, tasks);
    renderTasks();
  }

  function markComplete(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.status = 'Done';
    saveToStorage(TASKS_KEY, tasks);
    renderTasks();
  }

  function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    tasks = tasks.filter(x => x.id !== id);
    saveToStorage(TASKS_KEY, tasks);
    renderTasks();
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
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = Number(editTaskId.value);
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      t.title = editTitle.value.trim();
      t.list = editList.value.trim() || t.list;
      t.due = editDue.value.trim() || t.due;
      t.priority = editPriority.value;
      saveToStorage(TASKS_KEY, tasks);
      renderTasks();
      if (editModal) { editModal.classList.add('hidden'); editModal.classList.remove('flex'); }
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

});
