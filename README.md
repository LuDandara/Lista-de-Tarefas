# Tasky - Aplicativo de Gerenciamento de Tarefas (To-Do List)

Aplicação web moderna, responsiva e tátil para gerenciamento de tarefas, desenvolvida com **HTML5, CSS3 e JavaScript puro (ES6 Modules)**, inspirada nas diretrizes de **Delightful Tactile Minimalism** descritas em `DESIGN.md` e na interface de referência `screen.png`.

---

## 🚀 Funcionalidades

1. **CRUD Completo:**
   - Adicionar tarefas rapidamente pela barra de digitação rápida ou pelo botão "+ Nova Tarefa".
   - Visualizar detalhes, status e prazos com cálculo automático de atraso.
   - Editar título e prazo de vencimento via modal interativo.
   - Excluir tarefas com confirmação de segurança.

2. **Status da Tarefa:**
   - Alternar facilmente entre *Pendente* e *Concluída* através do botão de ação rápida (`Sim ✓` / `Concluído ✓` / `Desfazer`) e pelos checkboxes squircles.
   - Atualização em tempo real da barra de progresso do dia e percentual de conclusão.

3. **Filtros e Busca:**
   - Busca instantânea por palavras-chave na barra superior.
   - Navegação na barra lateral filtrando por **Todas**, **Pendentes** ou **Concluídas**.

4. **Datas e Prazos:**
   - Atribuição de data de vencimento com alertas visuais para tarefas em atraso.

5. **Persistência Híbrida (Firestore & LocalStorage):**
   - Suporte nativo ao **Google Cloud Firestore (Firebase SDK v10)** com escuta em tempo real (`onSnapshot`).
   - Modo de contingência automático com **LocalStorage**: o projeto funciona imediatamente de forma offline/local sem travar caso as chaves da nuvem ainda não tenham sido inseridas.

---

## 📁 Estrutura de Arquivos

```text
Lista de Tarefas/
├── index.html          # Estrutura semântica e acessível da interface
├── style.css           # Estilos baseados no DESIGN.md (paleta, sombras táteis, animações)
├── app.js              # Lógica de controle, CRUD, filtros e renderização dinâmica
├── firebase-config.js  # Configuração do Firebase Firestore
├── DESIGN.md           # Especificação do Design System
├── screen.png          # Mockup visual de referência
└── README.md           # Documentação e instruções de execução
```

---

## 🛠️ Como Executar Localmente

Como a aplicação utiliza módulos ES6 (`import`/`export`), navegadores modernos exigem que a página seja servida por um servidor HTTP local simples (evitando bloqueios de segurança do protocolo `file://`).

### Opção 1: Usando Python (já disponível na maioria dos sistemas)
Abra o PowerShell ou Prompt de Comando na pasta do projeto e execute:
```bash
python -m http.server 8000
```
Em seguida, abra no navegador: [http://localhost:8000](http://localhost:8000)

### Opção 2: Usando Node.js / npx
```bash
npx serve .
# ou
npx live-server
```

### Opção 3: Extensão Live Server do VS Code
- Abra a pasta do projeto no VS Code.
- Clique com o botão direito no arquivo `index.html` e selecione **"Open with Live Server"**.

---

## ☁️ Conectando ao Firebase Firestore

Para sincronizar com sua nuvem do Firebase:
1. Acesse o [Firebase Console](https://console.firebase.google.com/) e crie um projeto gratuito.
2. No menu lateral, ative o **Cloud Firestore** em modo de teste (`test mode`).
3. Vá em **Configurações do Projeto** > **Seus aplicativos** > **Adicionar aplicativo Web**.
4. Copie as chaves do objeto `firebaseConfig` e cole no arquivo [`firebase-config.js`](file:///c:/Users/Aluno/Downloads/Lista%20de%20Tarefas/firebase-config.js).
5. Pronto! Todas as tarefas passarão a ser sincronizadas em tempo real via nuvem.
