
// Usamos tipos definidos en types/modules.d.ts en lugar de @ts-ignore
import { initializeApp, getApps, getApp } from 'firebase/app'; 
import { 
  getAuth, 
  signInAnonymously, 
  linkWithCredential, 
  EmailAuthProvider, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

/**
 * @module AuthService
 * @ai-capability AUTH_CORE: Usa estas funciones para cualquier lógica de inicio/cierre de sesión.
 * @description Exporta las funciones nativas de Firebase configuradas para este proyecto.
 */
export { linkWithCredential, EmailAuthProvider, signInWithEmailAndPassword, sendPasswordResetEmail, signOut };

export interface FirebaseOptions {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  [key: string]: any;
}

export interface FirebaseApp {
  name: string;
  options: FirebaseOptions;
  automaticDataCollectionEnabled: boolean;
}

export interface Auth {
  app: FirebaseApp;
  currentUser: { uid: string, isAnonymous: boolean, email: string | null, metadata: any } | null;
}

export interface FirebaseInitResult {
  success: boolean;
  app?: any; // Usamos any o la interfaz del módulo declarado
  auth?: any; 
  error?: any;
  message: string;
  data?: any;
}

/**
 * Initializes the Firebase application with the provided configuration.
 * Mock implementation to allow compilation without valid firebase module.
 * @function initFirebase
 * @ai-usage Úsalo al arrancar la app o si el contexto de 'appInstance' es null.
 */
export const initFirebase = async (config: FirebaseOptions): Promise<FirebaseInitResult> => {
  try {
    console.log("Mocking Firebase initialization...");
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));

    const app: any = {
      name: "[DEFAULT]",
      options: config,
      automaticDataCollectionEnabled: true
    };

    // Initialize Auth service mock
    const auth: any = {
      app,
      currentUser: null
    };

    return {
      success: true,
      app,
      auth,
      message: "Firebase SDK inicializado correctamente (Mock)."
    };
  } catch (error: any) {
    console.error("Firebase initialization error:", error);
    return {
      success: false,
      error: error,
      message: error.message || "Error desconocido al inicializar Firebase."
    };
  }
};

/**
 * Función que realiza una prueba de conexión REAL de Auth.
 * Usa un nombre de app estático para mantener la persistencia.
 * @function testRealAuthConnection
 * @ai-usage Úsalo para validar si las credenciales son correctas antes de permitir operaciones de escritura.
 */
export const testRealAuthConnection = async (config: FirebaseOptions): Promise<FirebaseInitResult> => {
  try {
    if (!config.apiKey || !config.projectId) {
      throw new Error("La configuración de Firebase está incompleta.");
    }

    // 1. Usamos un NOMBRE FIJO. Esto permite que el navegador encuentre la sesión guardada.
    const STATIC_APP_NAME = "Firebase_Tester_Persistent_App";
    
    let app;
    
    // Verificamos si la app ya fue inicializada previamente para reutilizarla
    if (getApps().some((a: any) => a.name === STATIC_APP_NAME)) {
      app = getApp(STATIC_APP_NAME);
    } else {
      app = initializeApp(config, STATIC_APP_NAME);
    }

    const auth = getAuth(app);

    // 2. Aseguramos la persistencia en LocalStorage
    await setPersistence(auth, browserLocalPersistence);

    // 3. Verificamos si YA hay un usuario conectado antes de intentar loguear anónimamente
    if (!auth.currentUser) {
       console.log("No user found, signing in anonymously...");
       await signInAnonymously(auth);
    } else {
       console.log("User session restored:", auth.currentUser.uid);
    }

    return {
      success: true,
      app: app,
      auth: auth,
      message: "Conexión Real exitosa (Sesión Persistente).",
      data: {
        uid: auth.currentUser?.uid,
        isAnonymous: auth.currentUser?.isAnonymous,
        appName: app.name
      }
    };
  } catch (error: any) {
    // Si falla, devuelve el código de error real de Firebase
    return {
      success: false,
      message: `Fallo de conexión REAL: ${error.code || error.message}`
    };
  }
};

/**
 * Simulates signing in a user.
 */
export const mockSignIn = async (uid: string, app: FirebaseApp): Promise<Auth> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  
  return {
    app,
    currentUser: { uid, isAnonymous: true, email: null, metadata: {} }
  };
};

/**
 * Simulates signing out.
 */
export const mockSignOut = async (app: FirebaseApp): Promise<Auth> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return {
    app,
    currentUser: null
  };
};

export const getConfigDisplay = (config: any) => {
  if (!config || !config.apiKey) return { ...config };
  
  // Return a masked version of the config for display purposes
  return {
    ...config,
    apiKey: `${config.apiKey.substring(0, 6)}...${config.apiKey.substring(config.apiKey.length - 4)}`
  };
};
