// Gerenciador de Banco de Dados / Persistência Firestore pareado por UserID
import { firebaseConfig, COLLECTION_NAME } from "./firebase-config.js";
import { getCurrentUser, getAuthInstance } from "./auth.js?v=2";

let db = null;
let firestoreModule = null;
let unsubscribeSnapshot = null;
let onDataCallback = null;


// Inicializa a conexão com o Firestore para o usuário autenticado
export async function initDatabaseForUser(user, onUpdate, onError) {
  onDataCallback = onUpdate;

  // Se já havia um listener anterior ativo, cancela
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  if (!user || !user.uid) {
    if (onDataCallback) onDataCallback([], true);
    return;
  }

  try {
    const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = firestoreModule.getFirestore(app);

    // Consulta filtrando apenas pelo UserID (uid gerado pelo Firebase).
    // A remoção de orderBy evita a exigência de índice composto composto no Firestore.
    // A ordenação é realizada no lado do cliente (client-side) com JavaScript.
    const q = firestoreModule.query(
      firestoreModule.collection(db, COLLECTION_NAME),
      firestoreModule.where("userId", "==", user.uid)
    );

    // Ouvinte em tempo real
    unsubscribeSnapshot = firestoreModule.onSnapshot(q, (snapshot) => {
      const loadedTasks = [];
      snapshot.forEach((docSnap) => {
        loadedTasks.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Ordenação decrescente por createdAt realizada no client-side
      loadedTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      console.log(`[Firestore] ${loadedTasks.length} tarefas carregadas para o usuário:`, user.uid);
      if (onDataCallback) onDataCallback(loadedTasks, true);
    }, (err) => {
      console.error("Erro no listener do Firestore (onSnapshot):", err);
      // Notifica o callback de erro para que a interface não fique travada
      if (onError) {
        onError(err);
      } else if (onDataCallback) {
        // Fallback: libera a tela com lista vazia
        onDataCallback([], true);
      }
    });

  } catch (err) {
    console.error("Erro ao inicializar Firestore para usuário:", err);
    if (onError) onError(err);
    else if (onDataCallback) onDataCallback([], true);
  }
}

// Para a sincronização ao deslogar
export function stopDatabaseSync() {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  db = null;
  if (onDataCallback) onDataCallback([], true);
}

// Garante que o Firestore esteja pronto para gravação/leitura
async function ensureFirestore() {
  if (db && firestoreModule) return { db, firestoreModule };
  const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = firestoreModule.getFirestore(app);
  return { db, firestoreModule };
}

// 1. Adicionar Tarefa vinculada ao UserID
export async function dbAddTask(taskData) {
  let user = getCurrentUser();
  if (!user) {
    const { auth } = await getAuthInstance();
    user = auth.currentUser;
  }
  if (!user) throw new Error("Usuário não autenticado.");

  const { db: firestoreDb, firestoreModule: fsMod } = await ensureFirestore();

  try {
    const payload = {
      ...taskData,
      userId: user.uid, // Chave primária de vínculo do usuário
      createdAt: Date.now()
    };

    const docRef = await fsMod.addDoc(
      fsMod.collection(firestoreDb, COLLECTION_NAME),
      payload
    );
    console.log("[Firestore] Tarefa salva com sucesso:", docRef.id);
    return { id: docRef.id, ...payload };
  } catch (e) {
    console.error("[Firestore] Erro ao salvar tarefa:", e);
    throw e;
  }
}

// 2. Atualizar Tarefa
export async function dbUpdateTask(id, updateData) {
  let user = getCurrentUser();
  if (!user) {
    const { auth } = await getAuthInstance();
    user = auth.currentUser;
  }
  if (!user) throw new Error("Usuário não autenticado.");

  const { db: firestoreDb, firestoreModule: fsMod } = await ensureFirestore();

  try {
    const ref = fsMod.doc(firestoreDb, COLLECTION_NAME, id);
    await fsMod.updateDoc(ref, updateData);
    console.log("[Firestore] Tarefa atualizada:", id);
    return;
  } catch (e) {
    console.error("[Firestore] Erro ao atualizar tarefa:", e);
    throw e;
  }
}

// 3. Deletar Tarefa
export async function dbDeleteTask(id) {
  let user = getCurrentUser();
  if (!user) {
    const { auth } = await getAuthInstance();
    user = auth.currentUser;
  }
  if (!user) throw new Error("Usuário não autenticado.");

  const { db: firestoreDb, firestoreModule: fsMod } = await ensureFirestore();

  try {
    const ref = fsMod.doc(firestoreDb, COLLECTION_NAME, id);
    await fsMod.deleteDoc(ref);
    console.log("[Firestore] Tarefa deletada:", id);
    return;
  } catch (e) {
    console.error("[Firestore] Erro ao deletar tarefa:", e);
    throw e;
  }
}

