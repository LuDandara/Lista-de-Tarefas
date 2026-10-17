// Serviço de Autenticação com Firebase Auth
import { firebaseConfig } from "./firebase-config.js";

let auth = null;
let authModule = null;
let initialized = false;

// Inicializa a instância do Firebase Auth usando modular SDK v10
export async function getAuthInstance() {
  if (auth && authModule) {
    return { auth, authModule };
  }

  const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  authModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = authModule.getAuth(app);
  
  // Define persistência explícita na sessão/local
  await authModule.setPersistence(auth, authModule.browserLocalPersistence);

  initialized = true;
  return { auth, authModule };
}

// Observa mudanças no estado de autenticação
export async function observeAuthState(callback) {
  const { auth, authModule } = await getAuthInstance();
  return authModule.onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Recarrega o usuário para capturar alteração recente em emailVerified
      try {
        await user.reload();
      } catch (e) {
        console.warn("Aviso ao recarregar status do usuário:", e);
      }
    }
    callback(auth.currentUser);
  });
}

// 1. Cadastro com E-mail e Senha e disparo de verificação
export async function registerWithEmail(email, password) {
  const { auth, authModule } = await getAuthInstance();
  try {
    const cred = await authModule.createUserWithEmailAndPassword(auth, email, password);
    // Dispara automaticamente e-mail de verificação
    await authModule.sendEmailVerification(cred.user);
    return { success: true, user: cred.user };
  } catch (err) {
    console.error("[Auth Register Error]", err);
    throw new Error("E-mail ou senha incorretos. Por favor, tente novamente.");
  }
}

// 2. Login com E-mail e Senha
export async function loginWithEmail(email, password) {
  const { auth, authModule } = await getAuthInstance();
  try {
    const cred = await authModule.signInWithEmailAndPassword(auth, email, password);
    await cred.user.reload();
    return { success: true, user: auth.currentUser };
  } catch (err) {
    console.error("[Auth Login Error]", err);
    // Mensagem genérica e amigável para qualquer falha (nunca especifica se o erro foi no e-mail ou na senha)
    throw new Error("E-mail ou senha incorretos. Por favor, tente novamente.");
  }
}

// 3. Login com Google (OAuth)
export async function loginWithGoogle() {
  const { auth, authModule } = await getAuthInstance();
  try {
    const provider = new authModule.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await authModule.signInWithPopup(auth, provider);
    return { success: true, user: cred.user };
  } catch (err) {
    console.warn("[Auth Google Status]", err.code || err.message);
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
      throw new Error("Login cancelado. Por favor, tente novamente.");
    }
    if (err.code === "auth/popup-blocked") {
      throw new Error("O navegador bloqueou a janela pop-up do Google. Permita pop-ups para este site e tente novamente.");
    }
    throw new Error("E-mail ou senha incorretos. Por favor, tente novamente.");
  }
}


// 4. Reenviar e-mail de verificação
export async function resendVerificationEmail() {
  const { auth, authModule } = await getAuthInstance();
  const user = auth.currentUser;
  if (!user) throw new Error("Nenhum usuário logado.");
  try {
    await authModule.sendEmailVerification(user);
    return true;
  } catch (err) {
    console.error("[Resend Email Error]", err);
    throw new Error("Não foi possível enviar o e-mail de confirmação no momento. Tente novamente mais tarde.");
  }
}

// 5. Recarregar usuário (para checar se já clicou no link de verificação)
export async function checkEmailVerificationStatus() {
  const { auth } = await getAuthInstance();
  const user = auth.currentUser;
  if (user) {
    await user.reload();
    return auth.currentUser.emailVerified;
  }
  return false;
}

// 6. Redefinição de senha
export async function resetPassword(email) {
  const { auth, authModule } = await getAuthInstance();
  try {
    await authModule.sendPasswordResetEmail(auth, email);
    return true;
  } catch (err) {
    console.error("[Password Reset Error]", err);
    // Retorna mensagem genérica para evitar enumeração de contas
    throw new Error("E-mail ou senha incorretos. Por favor, tente novamente.");
  }
}

// 7. Logout
export async function logoutUser() {
  const { auth, authModule } = await getAuthInstance();
  try {
    await authModule.signOut(auth);
    return true;
  } catch (err) {
    console.error("[Auth SignOut Error]", err);
    throw err;
  }
}

// Obter usuário atual
export function getCurrentUser() {
  return auth ? auth.currentUser : null;
}
