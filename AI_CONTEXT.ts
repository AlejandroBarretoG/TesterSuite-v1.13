
/**
 * 🤖 AI STUDIO CONTEXT MAP
 * Lee este archivo para entender qué componentes reutilizar antes de generar nuevo código.
 * * --- AUTHENTICATION ---
 * - UI Component: <AuthLab /> (components/AuthLab.tsx)
 * -> Contiene: Login, Reset Password, Link Anonymous Account, UI de UserInfo.
 * - Logic Hook: useAuthLogic (hooks/useAuthLogic.ts)
 * -> Usar para lógica de login, logout, reset y vinculación en cualquier componente nuevo.
 * - Logic Service: services/firebase.ts
 * -> Primitivas nativas (signInWithEmailAndPassword, etc).
 * * --- DATABASE (FIRESTORE) ---
 * - Wrapper de Escritura: smartAddDoc (services/firestore.ts)
 * -> ¡IMPORTANTE! Usar esto para mantener el registro de colecciones actualizado.
 * - Admin UI: <FirestoreAdmin /> (components/FirestoreAdmin.tsx)
 * -> Editor JSON y visualizador de documentos.
 * * --- UI SYSTEM ---
 * - Icons: Lucide-React (Usar siempre para iconos)
 * - Styling: TailwindCSS (No usar CSS modules, solo clases utilitarias)
 * - Feedback: <StatusCard /> para mostrar estados de carga/éxito/error.
 * * --- PATRONES ---
 * 1. Persistencia: El usuario se guarda en localStorage ('firebase_config_input').
 * 2. Instancia: 'firebaseInstance' y 'authInstance' se pasan como props desde App.tsx.
 */
export const PROJECT_CAPABILITIES = {
  auth: "Usar hooks/useAuthLogic.ts para lógica y AuthLab.tsx como referencia de UI",
  db: "Usar smartAddDoc en firestore.ts para escrituras",
  ui: "Tailwind + Lucide React"
};
