import { initDatabaseForUser, stopDatabaseSync, dbAddTask, dbUpdateTask, dbDeleteTask } from "./storage.js?v=2";
import { 
  observeAuthState, 
  loginWithEmail, 
  registerWithEmail, 
  loginWithGoogle, 
  resetPassword, 
  resendVerificationEmail, 
  checkEmailVerificationStatus, 
  logoutUser 
} from "./auth.js?v=2";


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

  try {
    await dbAddTask(newTaskData);
    showToast("Tarefa criada com sucesso!");
  } catch (err) {
    console.error("Falha ao criar tarefa:", err);
    if (err.code === "permission-denied") {
      alert("Acesso negado: confirme se o seu e-mail foi verificado para liberar a gravação no Firestore.");
    } else {
      showToast("Erro ao salvar tarefa no Firestore.");
    }
  }
}

async function handleUpdateTask(id, updateData) {
  try {
    await dbUpdateTask(id, updateData);
    showToast("Tarefa atualizada!");
  } catch (err) {
    console.error("Falha ao atualizar tarefa:", err);
    showToast("Erro ao atualizar tarefa.");
  }
}

async function handleDeleteTask(id) {
  try {
    await dbDeleteTask(id);
    showToast("Tarefa excluída.");
  } catch (err) {
    console.error("Falha ao excluir tarefa:", err);
    showToast("Erro ao excluir tarefa.");
  }
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

// ==========================================================================
// Elementos da Interface de Autenticação e Loading
// ==========================================================================
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

const authModal = document.getElementById('auth-modal');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authMainTitle = document.getElementById('auth-main-title');
const authMainSubtitle = document.getElementById('auth-main-subtitle');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const btnAuthText = document.getElementById('btn-auth-text');
const btnToggleAuthMode = document.getElementById('btn-toggle-auth-mode');
const authSwitchText = document.getElementById('auth-switch-text');
const forgotPasswordRow = document.getElementById('forgot-password-row');
const btnForgotPassword = document.getElementById('btn-forgot-password');
const btnGoogleLogin = document.getElementById('btn-google-login');
const authErrorAlert = document.getElementById('auth-error-alert');
const authErrorMessage = document.getElementById('auth-error-message');

// Modal Esqueci a Senha
const resetModal = document.getElementById('reset-modal');
const resetPasswordForm = document.getElementById('reset-password-form');
const resetEmailInput = document.getElementById('reset-email');
const btnCancelReset = document.getElementById('btn-cancel-reset');
const resetErrorAlert = document.getElementById('reset-error-alert');
const resetErrorMessage = document.getElementById('reset-error-message');
const resetSuccessAlert = document.getElementById('reset-success-alert');

// Modal Verificação de E-mail Pendente
const verificationModal = document.getElementById('verification-modal');
const verifyEmailDisplay = document.getElementById('verify-email-display');
const btnCheckVerified = document.getElementById('btn-check-verified');
const btnResendVerification = document.getElementById('btn-resend-verification');
const btnVerificationLogout = document.getElementById('btn-verification-logout');

// Área Autenticada e Perfil
const authenticatedArea = document.getElementById('authenticated-area');
const userAvatarImg = document.getElementById('user-avatar-img');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayEmail = document.getElementById('user-display-email');
const btnLogout = document.getElementById('btn-logout');
const btnHeaderLogout = document.getElementById('btn-header-logout');

// Variáveis de Estado de Auth
let isRegisterMode = false;
let currentUser = null;

// Funções de Loading Overlay
function showLoading(text = "Carregando...") {
  if (loadingOverlay) {
    if (loadingText) loadingText.textContent = text;
    loadingOverlay.classList.add('active');
  }
}

function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.classList.remove('active');
  }
}

// Mensagens de Alerta Amigáveis
function showAuthError(msg = "E-mail ou senha incorretos. Por favor, tente novamente.") {
  if (authErrorAlert && authErrorMessage) {
    authErrorMessage.textContent = msg;
    authErrorAlert.style.display = 'flex';
  }
}

function hideAuthError() {
  if (authErrorAlert) {
    authErrorAlert.style.display = 'none';
  }
}

function showResetError(msg = "E-mail ou senha incorretos. Por favor, tente novamente.") {
  if (resetErrorAlert && resetErrorMessage) {
    resetErrorMessage.textContent = msg;
    resetErrorAlert.style.display = 'flex';
  }
}

function hideResetAlerts() {
  if (resetErrorAlert) resetErrorAlert.style.display = 'none';
  if (resetSuccessAlert) resetSuccessAlert.style.display = 'none';
}

// Alternar entre modo Login e modo Cadastro
function setAuthMode(register) {
  isRegisterMode = register;
  hideAuthError();
  if (isRegisterMode) {
    authMainTitle.textContent = "Criar Conta";
    authMainSubtitle.textContent = "Cadastre-se para sincronizar suas tarefas na nuvem.";
    btnAuthText.textContent = "Cadastrar e Enviar Confirmação";
    authSwitchText.textContent = "Já possui uma conta?";
    btnToggleAuthMode.textContent = "Faça Login";
    if (forgotPasswordRow) forgotPasswordRow.style.display = 'none';
  } else {
    authMainTitle.textContent = "Acessar Conta";
    authMainSubtitle.textContent = "Gerencie suas tarefas diárias com simplicidade e foco.";
    btnAuthText.textContent = "Entrar";
    authSwitchText.textContent = "Não tem uma conta?";
    btnToggleAuthMode.textContent = "Cadastre-se";
    if (forgotPasswordRow) forgotPasswordRow.style.display = 'flex';
  }
}

// Atualizar Informações do Perfil do Usuário na Sidebar
function updateUserProfileUI(user) {
  if (!user) return;
  const name = user.displayName || user.email.split('@')[0];
  if (userDisplayName) userDisplayName.textContent = name;
  if (userDisplayEmail) userDisplayEmail.textContent = user.email;
  if (userAvatarImg) {
    userAvatarImg.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
  }
}

// Tratamento do Fluxo de Autenticação e Proteção de Rotas/Dados
async function handleAuthState(user) {
  currentUser = user;

  if (!user) {
    // 1. Usuário Não Autenticado -> Exibir Tela de Login e Ocultar Área Autenticada
    stopDatabaseSync();
    tasks = [];
    render();
    if (authenticatedArea) authenticatedArea.style.display = 'none';
    if (verificationModal) verificationModal.style.display = 'none';
    if (resetModal) resetModal.style.display = 'none';
    if (authModal) authModal.style.display = 'flex';
    hideLoading();
    return;
  }

  // 2. Usuário Autenticado: verificar se o e-mail foi validado
  // Observação: Logins via Google já possuem emailVerified = true por padrão
  if (!user.emailVerified) {
    // Bloquear acesso às informações ou rotas protegidas
    stopDatabaseSync();
    tasks = [];
    render();
    if (authenticatedArea) authenticatedArea.style.display = 'none';
    if (authModal) authModal.style.display = 'none';
    if (resetModal) resetModal.style.display = 'none';
    if (verificationModal) {
      if (verifyEmailDisplay) verifyEmailDisplay.textContent = user.email;
      verificationModal.style.display = 'flex';
    }
    hideLoading();
    return;
  }

  // 3. Usuário Autenticado e E-mail Verificado (`emailVerified == true`)
  // Ocultar telas de login/recuperação/verificação e exibir a Área Autenticada
  if (authModal) authModal.style.display = 'none';
  if (verificationModal) verificationModal.style.display = 'none';
  if (resetModal) resetModal.style.display = 'none';
  if (authenticatedArea) authenticatedArea.style.display = 'flex';

  updateUserProfileUI(user);

  // Iniciar banco de dados Firestore pareado pelo UserID (uid)
  showLoading("Sincronizando suas tarefas...");
  await initDatabaseForUser(
    user, 
    (loadedTasks) => {
      tasks = loadedTasks || [];
      render();
      hideLoading();
    },
    (err) => {
      console.error("[Sync Error]", err);
      hideLoading();
      tasks = [];
      render();
      showToast("Não foi possível sincronizar suas tarefas no momento.");
    }
  );
}

// Listeners de Eventos de Autenticação
if (btnToggleAuthMode) {
  btnToggleAuthMode.addEventListener('click', () => {
    setAuthMode(!isRegisterMode);
  });
}

if (btnForgotPassword) {
  btnForgotPassword.addEventListener('click', () => {
    hideResetAlerts();
    if (authModal) authModal.style.display = 'none';
    if (resetModal) {
      if (authEmailInput && authEmailInput.value) {
        resetEmailInput.value = authEmailInput.value;
      }
      resetModal.style.display = 'flex';
    }
  });
}

if (btnCancelReset) {
  btnCancelReset.addEventListener('click', () => {
    if (resetModal) resetModal.style.display = 'none';
    if (authModal) authModal.style.display = 'flex';
  });
}

// Submissão do Formulário de Login / Cadastro
if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();

    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value;

    if (!email || !password) {
      showAuthError("Por favor, preencha todos os campos.");
      return;
    }

    if (isRegisterMode) {
      showLoading("Criando sua conta e enviando e-mail de confirmação...");
      try {
        await registerWithEmail(email, password);
        showToast("Conta criada! Enviamos um e-mail de confirmação.");
      } catch (err) {
        hideLoading();
        // Mensagem genérica e amigável conforme requisito
        showAuthError("E-mail ou senha incorretos. Por favor, tente novamente.");
      }
    } else {
      showLoading("Entrando na sua conta...");
      try {
        await loginWithEmail(email, password);
        showToast("Login realizado com sucesso!");
      } catch (err) {
        hideLoading();
        // Mensagem genérica e amigável conforme requisito
        showAuthError("E-mail ou senha incorretos. Por favor, tente novamente.");
      }
    }
  });
}

// Submissão de Redefinição de Senha
if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideResetAlerts();

    const email = resetEmailInput.value.trim();
    if (!email) return;

    showLoading("Enviando link de redefinição...");
    try {
      await resetPassword(email);
      hideLoading();
      if (resetSuccessAlert) resetSuccessAlert.style.display = 'flex';
    } catch (err) {
      hideLoading();
      showResetError("E-mail ou senha incorretos. Por favor, tente novamente.");
    }
  });
}

// Login com Google
if (btnGoogleLogin) {
  btnGoogleLogin.addEventListener('click', async () => {
    hideAuthError();
    showLoading("Conectando com o Google...");
    try {
      await loginWithGoogle();
      showToast("Conectado com o Google!");
    } catch (err) {
      hideLoading();
      showAuthError("E-mail ou senha incorretos. Por favor, tente novamente.");
    }
  });
}

// Checar Verificação de E-mail
if (btnCheckVerified) {
  btnCheckVerified.addEventListener('click', async () => {
    showLoading("Verificando status de ativação...");
    try {
      const isVerified = await checkEmailVerificationStatus();
      if (isVerified) {
        showToast("E-mail verificado com sucesso!");
        // O observeAuthState ou recarga dispara o fluxo
        if (currentUser) {
          await handleAuthState(currentUser);
        }
      } else {
        hideLoading();
        alert("Seu e-mail ainda não consta como confirmado. Por favor, clique no link enviado para a sua caixa de entrada.");
      }
    } catch (err) {
      hideLoading();
      alert("Erro ao verificar status. Tente novamente.");
    }
  });
}

// Reenviar E-mail de Verificação
if (btnResendVerification) {
  btnResendVerification.addEventListener('click', async () => {
    showLoading("Reenviando e-mail de confirmação...");
    try {
      await resendVerificationEmail();
      hideLoading();
      showToast("Novo e-mail de confirmação enviado!");
    } catch (err) {
      hideLoading();
      alert(err.message || "Não foi possível reenviar o e-mail no momento.");
    }
  });
}

// Logout da Tela de Verificação
if (btnVerificationLogout) {
  btnVerificationLogout.addEventListener('click', async () => {
    showLoading("Encerrando sessão...");
    try {
      await logoutUser();
    } finally {
      hideLoading();
    }
  });
}

// Ação de Logout com retorno imediato para a Tela de Login
async function executeLogout() {
  if (confirm("Deseja realmente sair da sua conta?")) {
    showLoading("Encerrando sessão...");
    try {
      await logoutUser();
      showToast("Você saiu da sua conta.");
    } finally {
      hideLoading();
    }
  }
}

// Logout no Botão da Sidebar
if (btnLogout) {
  btnLogout.addEventListener('click', executeLogout);
}

// Logout no Botão do Header/Topo da Área Autenticada
if (btnHeaderLogout) {
  btnHeaderLogout.addEventListener('click', executeLogout);
}


// Inicialização: Observar Estado de Autenticação
showLoading("Carregando aplicação...");

// Timeout de segurança: se o Firebase demorar mais de 6s para responder, destrava a tela de login
const authInitTimeout = setTimeout(() => {
  hideLoading();
  if (!currentUser && authModal && authModal.style.display !== 'flex' && (!authenticatedArea || authenticatedArea.style.display !== 'flex')) {
    authModal.style.display = 'flex';
  }
}, 6000);

observeAuthState((user) => {
  clearTimeout(authInitTimeout);
  handleAuthState(user);
});


