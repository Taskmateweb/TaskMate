// src/js/calendar.js - Calendar page functionality
import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  orderBy,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { db } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Calendar page loaded');

  // Check authentication
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Update profile email
    const profileEmail = document.getElementById('profileEmail');
    if (profileEmail && user.email) {
      profileEmail.textContent = user.email;
    }

    // Initialize calendar
    await initializeCalendar(user.uid);
  });

  // Logout functionality
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = 'index.html';
      } catch (error) {
        console.error('Logout error:', error);
        alert('Failed to logout. Please try again.');
      }
    });
  }

  // Profile menu toggle
  const profileBtn = document.getElementById('profileBtn');
  const profileMenu = document.getElementById('profileMenu');
  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = profileMenu.classList.contains('pointer-events-none');
      if (isHidden) {
        profileMenu.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        profileMenu.classList.add('opacity-100', 'scale-100');
        profileBtn.setAttribute('aria-expanded', 'true');
      } else {
        profileMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
        profileMenu.classList.remove('opacity-100', 'scale-100');
        profileBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('click', () => {
      profileMenu.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
      profileMenu.classList.remove('opacity-100', 'scale-100');
      profileBtn.setAttribute('aria-expanded', 'false');
    });
  }
});

async function initializeCalendar(userId) {
  console.log('Initializing calendar for user:', userId);
  
  if (!userId) {
    console.error('No user ID provided to initializeCalendar');
    alert('Authentication error. Please log in again.');
    window.location.href = 'login.html';
    return;
  }
  
  let events = [];
  let currentDate = new Date();
  let currentView = 'month';
  let selectedEventId = null;

  // DOM elements
  const $ = id => document.getElementById(id);
  const calendarGrid = $('calendarGrid');
  const currentMonthEl = $('currentMonth');
  const prevMonthBtn = $('prevMonth');
  const nextMonthBtn = $('nextMonth');
  const addEventBtn = $('addEventBtn');
  const eventModal = $('eventModal');
  const eventModalContent = $('eventModalContent');
  const eventForm = $('eventForm');
  const cancelEvent = $('cancelEvent');
  const upcomingEvents = $('upcomingEvents');
  const eventDetailsModal = $('eventDetailsModal');
  const closeEventDetails = $('closeEventDetails');
  const editEventFromDetails = $('editEventFromDetails');
  const deleteEventFromDetails = $('deleteEventFromDetails');
  const deleteEventBtn = $('deleteEventBtn');

  // Category colors
  const categoryColors = {
    meeting: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    personal: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    work: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
    birthday: { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
    holiday: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    other: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' }
  };

  // Load events from Firebase
  async function loadEvents() {
    try {
      const eventsRef = collection(db, 'users', userId, 'events');
      const q = query(eventsRef, orderBy('startDate', 'asc'));
      const snapshot = await getDocs(q);
      
      events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      renderCalendar();
      renderUpcomingEvents();
    } catch (error) {
      console.error('Error loading events:', error);
      events = [];
      renderCalendar();
    }
  }

  // Render calendar
  function renderCalendar() {
    if (!calendarGrid || !currentMonthEl) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthEl.textContent = `${monthNames[month]} ${year}`;

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    calendarGrid.innerHTML = '';

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const dayEl = createDayElement(day, month - 1, year, true);
      calendarGrid.appendChild(dayEl);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEl = createDayElement(day, month, year, false);
      calendarGrid.appendChild(dayEl);
    }

    // Next month days
    const totalCells = calendarGrid.children.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      const dayEl = createDayElement(day, month + 1, year, true);
      calendarGrid.appendChild(dayEl);
    }
  }

  function createDayElement(day, month, year, isOtherMonth) {
    const dayEl = document.createElement('div');
    dayEl.className = `calendar-day border rounded-xl p-3 cursor-pointer ${
      isOtherMonth ? 'bg-gray-50 text-gray-400' : 'bg-white hover:bg-primary-50'
    }`;

    // Check if today
    const today = new Date();
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    
    if (isToday && !isOtherMonth) {
      dayEl.classList.add('ring-2', 'ring-primary-500', 'bg-primary-50');
    }

    // Day number
    const dayNum = document.createElement('div');
    dayNum.className = `text-sm font-semibold mb-2 ${isToday ? 'text-primary-600' : ''}`;
    dayNum.textContent = day;
    dayEl.appendChild(dayNum);

    // Get events for this day
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter(e => e.startDate === dateStr);

    // Display events (max 3)
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'space-y-1';
    dayEvents.slice(0, 3).forEach(event => {
      const eventEl = document.createElement('div');
      const colors = categoryColors[event.category] || categoryColors.other;
      eventEl.className = `text-xs px-2 py-1 rounded ${colors.bg} ${colors.text} truncate cursor-pointer hover:shadow-md transition-shadow`;
      eventEl.textContent = event.title;
      eventEl.addEventListener('click', (e) => {
        e.stopPropagation();
        showEventDetails(event.id);
      });
      eventsContainer.appendChild(eventEl);
    });

    if (dayEvents.length > 3) {
      const moreEl = document.createElement('div');
      moreEl.className = 'text-xs text-gray-500 font-medium';
      moreEl.textContent = `+${dayEvents.length - 3} more`;
      eventsContainer.appendChild(moreEl);
    }

    dayEl.appendChild(eventsContainer);

    // Click to add event
    dayEl.addEventListener('click', () => {
      openEventModal(dateStr);
    });

    return dayEl;
  }

  // Render upcoming events
  function renderUpcomingEvents() {
    if (!upcomingEvents) return;

    const today = new Date();
    const upcoming = events
      .filter(e => new Date(e.startDate) >= today)
      .slice(0, 5);

    if (upcoming.length === 0) {
      upcomingEvents.innerHTML = '<p class="text-sm text-gray-500">No upcoming events</p>';
      return;
    }

    upcomingEvents.innerHTML = '';
    upcoming.forEach(event => {
      const colors = categoryColors[event.category] || categoryColors.other;
      const eventEl = document.createElement('div');
      eventEl.className = `p-3 rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer ${colors.bg}`;
      eventEl.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <h4 class="font-semibold ${colors.text} text-sm truncate">${escapeHtml(event.title)}</h4>
            <p class="text-xs text-gray-600 mt-1">
              <span class="inline-flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                ${formatDate(event.startDate)}
              </span>
              ${event.startTime ? `at ${event.startTime}` : ''}
            </p>
          </div>
          <span class="event-dot ${colors.dot}"></span>
        </div>
      `;
      eventEl.addEventListener('click', () => showEventDetails(event.id));
      upcomingEvents.appendChild(eventEl);
    });
  }

  // Open event modal
  function openEventModal(date = null, eventId = null) {
    if (!eventModal || !eventModalContent) return;

    selectedEventId = eventId;
    const modalTitle = $('modalTitle');
    
    if (eventId) {
      // Edit mode
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      
      modalTitle.textContent = 'Edit Event';
      $('eventId').value = event.id;
      $('eventTitle').value = event.title;
      $('eventStartDate').value = event.startDate;
      $('eventStartTime').value = event.startTime || '';
      $('eventEndDate').value = event.endDate;
      $('eventEndTime').value = event.endTime || '';
      $('eventCategory').value = event.category;
      $('eventDescription').value = event.description || '';
      $('eventLocation').value = event.location || '';
      $('eventReminder').checked = event.reminder || false;
      
      deleteEventBtn.classList.remove('hidden');
    } else {
      // Add mode
      modalTitle.textContent = 'Add New Event';
      eventForm.reset();
      $('eventId').value = '';
      if (date) {
        $('eventStartDate').value = date;
        $('eventEndDate').value = date;
      }
      deleteEventBtn.classList.add('hidden');
    }

    eventModal.classList.remove('hidden');
    eventModal.classList.add('flex');
    setTimeout(() => {
      eventModalContent.classList.remove('scale-95', 'opacity-0');
      eventModalContent.classList.add('scale-100', 'opacity-100');
    }, 20);
  }

  function closeEventModal() {
    if (!eventModal || !eventModalContent) return;
    eventModalContent.classList.add('scale-95', 'opacity-0');
    eventModalContent.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => {
      eventModal.classList.add('hidden');
      eventModal.classList.remove('flex');
    }, 200);
  }

  // Show event details
  function showEventDetails(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event || !eventDetailsModal) return;

    selectedEventId = eventId;
    const colors = categoryColors[event.category] || categoryColors.other;

    $('detailEventTitle').textContent = event.title;
    $('detailEventContent').innerHTML = `
      <div class="flex items-center gap-2">
        <span class="event-dot ${colors.dot}"></span>
        <span class="px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}">${event.category}</span>
      </div>
      ${event.description ? `<p class="text-gray-700 mt-3">${escapeHtml(event.description)}</p>` : ''}
      <div class="mt-4 space-y-2">
        <div class="flex items-center gap-2 text-gray-600">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>${formatDate(event.startDate)} ${event.startTime ? `at ${event.startTime}` : ''}</span>
        </div>
        ${event.endDate && event.endDate !== event.startDate ? `
          <div class="flex items-center gap-2 text-gray-600">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            <span>${formatDate(event.endDate)} ${event.endTime ? `at ${event.endTime}` : ''}</span>
          </div>
        ` : ''}
        ${event.location ? `
          <div class="flex items-center gap-2 text-gray-600">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>${escapeHtml(event.location)}</span>
          </div>
        ` : ''}
      </div>
    `;

    eventDetailsModal.classList.remove('hidden');
    eventDetailsModal.classList.add('flex');
  }

  // Event form submission
  if (eventForm) {
    eventForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate form
      if (!$('eventTitle').value.trim()) {
        alert('Please enter an event title');
        return;
      }

      if (!$('eventStartDate').value || !$('eventEndDate').value) {
        alert('Please select start and end dates');
        return;
      }

      const eventData = {
        title: $('eventTitle').value.trim(),
        startDate: $('eventStartDate').value,
        startTime: $('eventStartTime').value || '',
        endDate: $('eventEndDate').value,
        endTime: $('eventEndTime').value || '',
        category: $('eventCategory').value,
        description: $('eventDescription').value.trim() || '',
        location: $('eventLocation').value.trim() || '',
        reminder: $('eventReminder').checked || false
      };

      try {
        const eventId = $('eventId').value;
        const submitBtn = eventForm.querySelector('button[type="submit"]');
        
        console.log('Saving event for user:', userId);
        console.log('Event data:', eventData);
        console.log('Event ID:', eventId || 'new event');
        
        // Disable button during save
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Saving...';
        }
        
        if (eventId) {
          // Update existing event
          eventData.updatedAt = new Date().toISOString();
          const eventRef = doc(db, 'users', userId, 'events', eventId);
          console.log('Updating event at path:', `users/${userId}/events/${eventId}`);
          await updateDoc(eventRef, eventData);
          
          const index = events.findIndex(e => e.id === eventId);
          if (index !== -1) {
            events[index] = { id: eventId, ...eventData };
          }
          console.log('Event updated successfully');
        } else {
          // Create new event
          eventData.createdAt = new Date().toISOString();
          eventData.updatedAt = new Date().toISOString();
          const eventsRef = collection(db, 'users', userId, 'events');
          console.log('Creating event at path:', `users/${userId}/events`);
          const docRef = await addDoc(eventsRef, eventData);
          
          events.push({ id: docRef.id, ...eventData });
          console.log('Event created successfully with ID:', docRef.id);
        }
        
        // Re-enable button
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Event';
        }

        closeEventModal();
        renderCalendar();
        renderUpcomingEvents();
      } catch (error) {
        console.error('Error saving event:', error);
        
        // Re-enable button
        const submitBtn = eventForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Event';
        }
        
        // Show specific error message
        let errorMsg = 'Failed to save event. ';
        if (error.code === 'permission-denied') {
          errorMsg += 'You do not have permission to save events.';
        } else if (error.code === 'unauthenticated') {
          errorMsg += 'Please log in again.';
        } else if (error.message) {
          errorMsg += error.message;
        } else {
          errorMsg += 'Please try again.';
        }
        
        alert(errorMsg);
      }
    });
  }

  // Delete event
  async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const eventRef = doc(db, 'users', userId, 'events', eventId);
      await deleteDoc(eventRef);
      
      events = events.filter(e => e.id !== eventId);
      
      closeEventModal();
      if (eventDetailsModal) {
        eventDetailsModal.classList.add('hidden');
        eventDetailsModal.classList.remove('flex');
      }
      
      renderCalendar();
      renderUpcomingEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  }

  // Event listeners
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });
  }

  if (addEventBtn) {
    addEventBtn.addEventListener('click', () => openEventModal());
  }

  if (cancelEvent) {
    cancelEvent.addEventListener('click', closeEventModal);
  }

  if (eventModal) {
    eventModal.addEventListener('click', (e) => {
      if (e.target === eventModal) closeEventModal();
    });
  }

  if (closeEventDetails) {
    closeEventDetails.addEventListener('click', () => {
      eventDetailsModal.classList.add('hidden');
      eventDetailsModal.classList.remove('flex');
    });
  }

  if (editEventFromDetails) {
    editEventFromDetails.addEventListener('click', () => {
      eventDetailsModal.classList.add('hidden');
      eventDetailsModal.classList.remove('flex');
      openEventModal(null, selectedEventId);
    });
  }

  if (deleteEventFromDetails) {
    deleteEventFromDetails.addEventListener('click', () => {
      deleteEvent(selectedEventId);
    });
  }

  if (deleteEventBtn) {
    deleteEventBtn.addEventListener('click', () => {
      deleteEvent(selectedEventId);
    });
  }

  // Helper functions
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  // Initialize
  loadEvents();
}
