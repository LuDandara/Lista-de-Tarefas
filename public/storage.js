// Gerenciador de Banco de Dados / Persistência
// Suporta: Firebase Firestore com fallback e diagnóstico
import { firebaseConfig, COLLECTION_NAME } from "./firebase-config.js";

const LOCAL_STORAGE_KEY = "tasky_tasks_v2";

let db = null;
let useFirestore = false;
let onDataCallback = null;

// Módulos do Firestore em cache para evitar múltiplos dynamic imports
let firestoreModule = null;

export async function initDatabase(onUpdate) {
  onDataCallback = onUpdate;
  const isDefaultKey = !firebaseConfig.apiKey || firebaseConfig.apiKey === "SUA_API_KEY";

  if (!isDefaultKey) {
    try {
      console.log("Iniciando conexão com o Firebase Firestore...");
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
      firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

      const app = initializeApp(firebaseConfig);
      db = firestoreModule.getFirestore(app);
      useFirestore = true;
      console.log("Firebase App e Firestore instanciados com sucesso!");

      const q = firestoreModule.query(
        firestoreModule.collection(db, COLLECTION_NAME),
        firestoreModule.orderBy("createdAt", "desc")
      );

      // Ouvinte em tempo real com tratamento detalhado de erros
      firestoreModule.onSnapshot(q, (snapshot) => {
        const loadedTasks = [];
        snapshot.forEach((docSnap) => {
          loadedTasks.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log(`[Firestore] ${loadedTasks.length} tarefas carregadas em tempo real.`);
        if (onDataCallback) onDataCallback(loadedTasks, true);
      }, (err) => {
        console.error("Erro no listener do Firestore (onSnapshot):", err);
        if (err.code === "permission-denied") {
          console.warn("Regras de segurança do Firestore bloquearam a leitura. Verifique se o banco está em modo de teste ou se as regras permitem 'read, write: if true;'.");
        }
        // Ativa fallback para manter a usabilidade da aplicação
        startLocalStorage();
      });

      return;
    } catch (err) {
      console.error("Erro fatal ao inicializar Firebase SDK:", err);
    }
  } else {
    console.warn("Chaves do Firebase em firebase-config.js ainda estão com valor padrão. Usando LocalStorage.");
  }

  startLocalStorage();
}

function startLocalStorage() {
  useFirestore = false;
  console.log("Armazenamento local (LocalStorage) ativo.");
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  let tasks = [];
  if (stored) {
    try {
      tasks = JSON.parse(stored);
    } catch (e) {
      tasks = [];
    }
  }
  if (onDataCallback) onDataCallback(tasks, false);
}

export async function dbAddTask(taskData) {
  if (useFirestore && db && firestoreModule) {
    try {
      const docRef = await firestoreModule.addDoc(
        firestoreModule.collection(db, COLLECTION_NAME),
        taskData
      );
      console.log("[Firestore] Tarefa salva com sucesso com ID:", docRef.id);
      return { id: docRef.id, ...taskData };
    } catch (e) {
      console.error("[Firestore] Erro ao salvar tarefa:", e);
      if (e.code === "permission-denied") {
        alert("Atenção: O Firestore rejeitou a gravação por falta de permissão (permission-denied). Configure as regras de segurança no Firebase Console para permitir leitura e escrita.");
      }
    }
  }

  // Fallback LocalStorage
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  let tasks = stored ? JSON.parse(stored) : [];
  const newTask = {
    id: "task_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    ...taskData
  };
  tasks.unshift(newTask);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  if (onDataCallback) onDataCallback(tasks, false);
  return newTask;
}

export async function dbUpdateTask(id, updateData) {
  if (useFirestore && db && firestoreModule) {
    try {
      const ref = firestoreModule.doc(db, COLLECTION_NAME, id);
      await firestoreModule.updateDoc(ref, updateData);
      console.log("[Firestore] Tarefa atualizada:", id);
      return;
    } catch (e) {
      console.error("[Firestore] Erro ao atualizar tarefa:", e);
    }
  }

  // Fallback LocalStorage
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  let tasks = stored ? JSON.parse(stored) : [];
  tasks = tasks.map(t => t.id === id ? { ...t, ...updateData } : t);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  if (onDataCallback) onDataCallback(tasks, false);
}

export async function dbDeleteTask(id) {
  if (useFirestore && db && firestoreModule) {
    try {
      const ref = firestoreModule.doc(db, COLLECTION_NAME, id);
      await firestoreModule.deleteDoc(ref);
      console.log("[Firestore] Tarefa deletada:", id);
      return;
    } catch (e) {
      console.error("[Firestore] Erro ao deletar tarefa:", e);
    }
  }

  // Fallback LocalStorage
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  let tasks = stored ? JSON.parse(stored) : [];
  tasks = tasks.filter(t => t.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  if (onDataCallback) onDataCallback(tasks, false);
}
