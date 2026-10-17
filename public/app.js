import { initDatabase, dbAddTask, dbUpdateTask, dbDeleteTask } from "./storage.js";

// Estado da aplicação
let tasks = [];
let activeFilter = 'all'; // 'all', 'pending', 'completed'
let searchQuery = '';

// Elementos da DOM
const pendingTasksList = document.getElementById('pending-tasks-list');
const completedTasksList = document.getElementById('completed-tasks-list');
const pendingSection = document.getElementById('pending-section');
const completedSection = document.getElementById('completed-section');
const pendingCountBadge = document.getElementById('pending-count-badge');
const completedCountBadge = document.getElementById('completed-count-badge');
const navAllCount = document.getElementById('nav-all-count');
const navPendingCount = document.getElementById('nav-pending-count');
const navCompletedCount = document.getElementById('nav-completed-count');

// Estatísticas e Progresso
const statTotal = document.getElementById('stat-total');
const statPending = document.getElementById('stat-pending');
const statCompleted = document.getElementById('stat-completed');
const progressTitle = document.getElementById('progress-title');
const progressFill = document.getElementById('progress-fill');
const headerSubtitleCount = document.getElementById('header-subtitle-count');

// Inputs e Filtros
const quickAddForm = document.getElementById('quick-add-form');
const quickAddInput = document.getElementById('quick-add-input');
const quickAddDate = document.getElementById('quick-add-date');
const searchInput = document.getElementById('search-input');
const navItems = document.querySelectorAll('.nav-item[data-filter]');

// Modal de Criação / Edição
const taskModal = document.getElementById('task-modal');
const modalTitle = document.getElementById('modal-title');
const modalForm = document.getElementById('modal-form');
const modalTaskId = document.getElementById('modal-task-id');
const modalTaskInput = document.getElementById('modal-task-input');
const modalDueDateInput = document.getElementById('modal-due-date');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');

// Toast
const toast = document.getElementById('toast');

// Feedback Toast
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Manipulação do Modal
function openCreateModal() {
  if (!taskModal) return;
  modalTitle.textContent = "Nova Tarefa";
  modalTaskId.value = "";
  modalTaskInput.value = "";
  modalDueDateInput.value = "";
  taskModal.classList.add('active');
  setTimeout(() => {
    if (modalTaskInput) modalTaskInput.focus();
  }, 100);
}

function openEditModal(id) {
  if (!taskModal) return;
  const task = tasks.find(t => String(t.id) === String(id));
  if (!task) return;
  modalTitle.textContent = "Editar Tarefa";
  modalTaskId.value = task.id;
  modalTaskInput.value = task.title;
  modalDueDateInput.value = task.dueDate || "";
  taskModal.classList.add('active');
  setTimeout(() => {
    if (modalTaskInput) modalTaskInput.focus();
  }, 100);
}

function closeModal() {
  if (taskModal) {
    taskModal.classList.remove('active');
  }
}

// Ações de Criação e Atualização
async function handleAddTask(title, dueDate = "") {
  if (!title || !title.trim()) return;

  const newTaskData = {
    title: title.trim(),
    completed: false,
    dueDate: dueDate || "",
    createdAt: Date.now()
  };

  await dbAddTask(newTaskData);
  showToast("Tarefa criada com sucesso!");
}

async function handleUpdateTask(id, updateData) {
  await dbUpdateTask(id, updateData);
  showToast("Tarefa atualizada!");
}

async function handleDeleteTask(id) {
  await dbDeleteTask(id);
  showToast("Tarefa excluída.");
}

async function handleToggleTaskStatus(id) {
  const task = tasks.find(t => String(t.id) === String(id));
  if (!task) return;
  const newStatus = !task.completed;
  await handleUpdateTask(id, { completed: newStatus });
  showToast(newStatus ? "Tarefa concluída! 🎉" : "Tarefa reaberta.");
}

// Formatação de Data
function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Renderização Principal
function render() {
  // Filtro por termo de busca
  let filtered = tasks.filter(t => {
    return (t.title || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const pendingList = filtered.filter(t => !t.completed);
  const completedList = filtered.filter(t => t.completed);

  // Totais globais
  const totalCount = tasks.length;
  const pendingCount = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Atualização dos Indicadores e Contadores
  if (statTotal) statTotal.textContent = totalCount;
  if (statPending) statPending.textContent = pendingCount;
  if (statCompleted) statCompleted.textContent = completedCount;
  
  if (progressTitle) {
    if (totalCount === 0) {
      progressTitle.textContent = "Nenhuma tarefa cadastrada";
    } else {
      progressTitle.textContent = `${completedCount} de ${totalCount} tarefas concluídas (${percent}%)`;
    }
  }
  if (progressFill) progressFill.style.width = `${percent}%`;

  if (headerSubtitleCount) {
    headerSubtitleCount.textContent = `${pendingCount} pendente${pendingCount !== 1 ? 's' : ''} • ${completedCount} concluída${completedCount !== 1 ? 's' : ''}`;
  }

  if (navAllCount) navAllCount.textContent = totalCount;
  if (navPendingCount) navPendingCount.textContent = pendingCount;
  if (navCompletedCount) navCompletedCount.textContent = completedCount;

  if (pendingCountBadge) pendingCountBadge.textContent = `(${pendingList.length})`;
  if (completedCountBadge) completedCountBadge.textContent = `(${completedList.length})`;

  // Visibilidade por Filtro
  if (activeFilter === 'pending') {
    if (pendingSection) pendingSection.style.display = 'flex';
    if (completedSection) completedSection.style.display = 'none';
  } else if (activeFilter === 'completed') {
    if (pendingSection) pendingSection.style.display = 'none';
    if (completedSection) completedSection.style.display = 'flex';
  } else {
    if (pendingSection) pendingSection.style.display = 'flex';
    if (completedSection) completedSection.style.display = 'flex';
  }

  // Lista de Pendentes
  if (pendingTasksList) {
    if (pendingList.length === 0) {
      pendingTasksList.innerHTML = `<div class="empty-state">Nenhuma tarefa pendente. Comece adicionando uma no campo acima ou no botão Nova Tarefa!</div>`;
    } else {
      pendingTasksList.innerHTML = pendingList.map(t => renderTaskCard(t)).join('');
    }
  }

  // Lista de Concluídas
  if (completedTasksList) {
    if (completedList.length === 0) {
      completedTasksList.innerHTML = `<div class="empty-state">Nenhuma tarefa concluída no momento.</div>`;
    } else {
      completedTasksList.innerHTML = completedList.map(t => renderTaskCard(t)).join('');
    }
  }

  attachCardEvents();
}

function renderTaskCard(task) {
  const isDone = Boolean(task.completed);
  const formattedDate = formatDate(task.dueDate);
  const overdueClass = (!isDone && isOverdue(task.dueDate)) ? 'overdue' : '';

  return `
    <div class="task-card ${isDone ? 'completed' : ''}" data-id="${task.id}">
      <div class="task-left">
        <div class="squircle-checkbox ${isDone ? 'checked' : ''}" data-action="toggle" title="${isDone ? 'Reabrir' : 'Concluir'}">
          ${isDone ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </div>
        <div class="task-content">
          <span class="task-title" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>
          ${formattedDate ? `
            <span class="task-due ${overdueClass}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${formattedDate} ${overdueClass ? '(Atrasada)' : ''}
            </span>
          ` : ''}
        </div>
      </div>

      <div class="task-right">
        ${!isDone ? `
          <span class="status-label-hint">Concluído?</span>
          <button class="btn-toggle-status" data-action="toggle" title="Marcar como concluída">
            Sim
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        ` : `
          <button class="btn-completed-badge" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Concluído
          </button>
          <button class="btn-undo" data-action="toggle">Desfazer</button>
        `}

        <div class="task-actions">
          <button class="btn-row-action" data-action="edit" title="Editar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-row-action delete" data-action="delete" title="Excluir">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachCardEvents() {
  document.querySelectorAll('.task-card').forEach(card => {
    const id = card.dataset.id;

    card.querySelectorAll('[data-action="toggle"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handleToggleTaskStatus(id);
      });
    });

    card.querySelectorAll('[data-action="delete"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm("Deseja realmente excluir esta tarefa?")) {
          handleDeleteTask(id);
        }
      });
    });

    card.querySelectorAll('[data-action="edit"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(id);
      });
    });
  });
}

// Registro de Eventos dos Controles
if (btnOpenModal) {
  btnOpenModal.addEventListener('click', (e) => {
    e.preventDefault();
    openCreateModal();
  });
}

if (btnCancelModal) {
  btnCancelModal.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
  });
}

if (quickAddForm) {
  quickAddForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = quickAddInput.value.trim();
    const date = quickAddDate.value;
    if (text) {
      handleAddTask(text, date);
      quickAddInput.value = '';
      quickAddDate.value = '';
    }
  });
}

if (modalForm) {
  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = modalTaskId.value;
    const title = modalTaskInput.value.trim();
    const dueDate = modalDueDateInput.value;

    if (!title) return;

    if (id) {
      handleUpdateTask(id, { title, dueDate });
    } else {
      handleAddTask(title, dueDate);
    }

    closeModal();
  });
}

if (taskModal) {
  taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
      closeModal();
    }
  });
}

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
  });
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    activeFilter = item.dataset.filter;
    render();
  });
});

// Inicialização com Callback de Dados
initDatabase((loadedTasks, isFirestore) => {
  tasks = loadedTasks || [];
  render();
  if (isFirestore) {
    showToast("Nuvem Firestore conectada!");
  }
});
