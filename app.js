const STORAGE_KEY = 'study-mission-assignments';

let assignments = [];
let activeFilter = 'all';
let editingId = null;

const elements = {
  list: document.querySelector('#assignmentList'),
  form: document.querySelector('#assignmentForm'),
  modal: document.querySelector('#modalBackdrop'),
  name: document.querySelector('#assignmentName'),
  subject: document.querySelector('#assignmentSubject'),
  dueDate: document.querySelector('#assignmentDueDate'),
  modalTitle: document.querySelector('#modalTitle'),
  modalEyebrow: document.querySelector('#modalEyebrow'),
  submit: document.querySelector('#submitAssignmentButton'),
  unfinished: document.querySelector('#unfinishedCount'),
  completed: document.querySelector('#completedCount'),
  highPriority: document.querySelector('#highPriorityCount'),
  nextName: document.querySelector('#nextAssignmentName'),
  nextDue: document.querySelector('#nextAssignmentDue'),
  count: document.querySelector('#assignmentCount'),
  currentDate: document.querySelector('#currentDate'),
  greetingTime: document.querySelector('#greetingTime'),
  addAssignmentButton: document.querySelector('#addAssignmentButton')
};

function loadAssignments() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveAssignments() { localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments)); }
function createId() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function formatDate(dateString) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${dateString}T12:00:00`)); }
function isOverdue(assignment) { return !assignment.completed && new Date(`${assignment.dueDate}T23:59:59`) < new Date(); }
function calendarDate(dateString) {
  const date = dateString ? new Date(`${dateString}T00:00:00`) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
function daysFromNow(dateString) { return Math.round((calendarDate(dateString) - calendarDate()) / 86400000); }
function priorityRank(priority) { return { High: 0, Medium: 1, Low: 2 }[priority] ?? 3; }
function assignmentComparator(a, b) {
  const completionDifference = Number(a.completed) - Number(b.completed);
  if (completionDifference) return completionDifference;
  const dueDateDifference = calendarDate(a.dueDate) - calendarDate(b.dueDate);
  return dueDateDifference || priorityRank(a.priority) - priorityRank(b.priority);
}
function dueCopy(assignment) {
  const days = daysFromNow(assignment.dueDate);
  if (isOverdue(assignment)) return 'Overdue';
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
function getCurrentDate() {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
}

function render() {
  const unfinished = assignments.filter((assignment) => !assignment.completed);
  const visible = assignments.filter((assignment) => activeFilter === 'all' || (activeFilter === 'active' && !assignment.completed) || (activeFilter === 'completed' && assignment.completed)).sort(assignmentComparator);
  const next = [...unfinished].sort(assignmentComparator)[0];

  elements.unfinished.textContent = unfinished.length;
  elements.completed.textContent = assignments.filter((assignment) => assignment.completed).length;
  elements.highPriority.textContent = unfinished.filter((assignment) => assignment.priority === 'High').length;
  elements.count.textContent = visible.length;
  elements.nextName.textContent = next ? next.name : 'No upcoming work';
  elements.nextDue.textContent = next ? `${next.subject} · ${dueCopy(next)}` : 'Add an assignment to get started';

  if (!visible.length) {
    elements.list.innerHTML = `<div class="empty-state"><strong>${activeFilter === 'completed' ? 'Nothing completed yet' : 'Your plate is clear'}</strong><p>${activeFilter === 'completed' ? 'Completed assignments will appear here.' : 'Add your next assignment and make a plan.'}</p></div>`;
    return;
  }
  elements.list.innerHTML = visible.map((assignment, index) => `
    <article class="assignment-row ${assignment.completed ? 'done' : ''}" style="animation-delay:${index * 35}ms">
      <button class="check-button" data-action="complete" data-id="${assignment.id}" type="button" aria-label="${assignment.completed ? 'Mark incomplete' : 'Mark complete'} ${escapeHtml(assignment.name)}">${assignment.completed ? '✓' : ''}</button>
      <div class="assignment-details"><span class="assignment-name">${escapeHtml(assignment.name)}</span><span class="assignment-subject">${escapeHtml(assignment.subject)}</span></div>
      <span class="due-date ${isOverdue(assignment) ? 'overdue' : ''}">${assignment.completed ? formatDate(assignment.dueDate) : dueCopy(assignment)}</span>
      <span class="priority-badge ${assignment.priority}">${assignment.priority}</span>
      <span class="due-date desktop-date">${formatDate(assignment.dueDate)}</span>
      <div class="row-actions"><button class="icon-button" data-action="edit" data-id="${assignment.id}" type="button" aria-label="Edit ${escapeHtml(assignment.name)}">✎</button><button class="icon-button" data-action="delete" data-id="${assignment.id}" type="button" aria-label="Delete ${escapeHtml(assignment.name)}">⌫</button></div>
    </article>`).join('');
}

function escapeHtml(value) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character])); }
function openModal(assignment) {
  editingId = assignment?.id || null;
  elements.modal.hidden = false;
  elements.modalTitle.textContent = assignment ? 'Edit assignment' : 'Add assignment';
  elements.modalEyebrow.textContent = assignment ? 'Update mission' : 'New mission';
  elements.submit.innerHTML = `${assignment ? 'Save changes' : 'Add assignment'} <span aria-hidden="true">→</span>`;
  elements.form.reset();
  if (assignment) {
    elements.name.value = assignment.name; elements.subject.value = assignment.subject; elements.dueDate.value = assignment.dueDate;
    document.querySelector(`input[name="priority"][value="${assignment.priority}"]`).checked = true;
  } else { elements.dueDate.value = new Date().toISOString().slice(0, 10); }
  elements.name.focus();
}
function closeModal() { elements.modal.hidden = true; editingId = null; }

if (elements.addAssignmentButton) elements.addAssignmentButton.addEventListener('click', () => openModal());
document.querySelector('#closeModalButton').addEventListener('click', closeModal);
elements.modal.addEventListener('click', (event) => { if (event.target === elements.modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !elements.modal.hidden) closeModal(); });
elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(elements.form);
  const data = { name: formData.get('name').trim(), subject: formData.get('subject'), dueDate: formData.get('dueDate'), priority: formData.get('priority') };
  if (editingId) assignments = assignments.map((assignment) => assignment.id === editingId ? { ...assignment, ...data } : assignment);
  else assignments.push({ id: createId(), ...data, completed: false });
  saveAssignments();
  render();
  closeModal();
});

document.querySelectorAll('.filter-button').forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter-button').forEach((item) => item.classList.toggle('active', item === button));
  render();
}));

elements.list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  const assignment = assignments.find((item) => item.id === id);
  if (!assignment) return;
  if (action === 'complete') assignment.completed = !assignment.completed;
  if (action === 'delete') assignments = assignments.filter((item) => item.id !== id);
  if (action === 'edit') return openModal(assignment);
  saveAssignments();
  render();
});

assignments = loadAssignments();
elements.currentDate.textContent = getCurrentDate();
elements.greetingTime.textContent = getGreeting();
render();
