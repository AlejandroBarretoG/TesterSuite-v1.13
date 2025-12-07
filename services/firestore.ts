
import { getFirestore, doc, setDoc, getDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { FirebaseInitResult } from './firebase';
import { registerCollection } from './registryService';

/**
 * WRAPPER INTELIGENTE: smartAddDoc
 * Agrega un documento y registra la colección automáticamente.
 * @ai-capability DATABASE_WRITE: SIEMPRE usa esta función en lugar de 'addDoc' nativo de Firebase.
 * @reason Esta función asegura que la colección quede registrada en el '_app_registry' automáticamente.
 */
export const smartAddDoc = async (appInstance: any, collectionName: string, data: any) => {
  const db = getFirestore(appInstance);
  const colRef = collection(db, collectionName);
  
  // 1. Operación Real
  const docRef = await addDoc(colRef, data);

  // 2. Registro en segundo plano (Fire & Forget)
  registerCollection(appInstance, collectionName).catch(console.warn);

  return docRef;
};

/**
 * WRAPPER INTELIGENTE: smartSetDoc
 * Escribe un documento específico y registra la colección automáticamente.
 */
export const smartSetDoc = async (appInstance: any, collectionName: string, docId: string, data: any, options: any = {}) => {
  const db = getFirestore(appInstance);
  const docRef = doc(db, collectionName, docId);

  // 1. Operación Real
  await setDoc(docRef, data, options);

  // 2. Registro en segundo plano (Fire & Forget)
  registerCollection(appInstance, collectionName).catch(console.warn);

  return docRef;
};

/**
 * Realiza una prueba de conexión REAL a Cloud Firestore.
 * Escribe, Lee y Borra un documento en la colección '_diagnostics'.
 */
export const testFirestoreConnection = async (appInstance: any, uid: string): Promise<FirebaseInitResult> => {
  const TIMEOUT_MS = 5000;

  // 1. Promesa de Timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error("TIMEOUT_EXCEEDED"));
    }, TIMEOUT_MS);
  });

  // 2. Operación Real
  const operationPromise = async (): Promise<FirebaseInitResult> => {
    try {
      const db = getFirestore(appInstance);
      const docPath = `_diagnostics/test_${uid}`;
      const docRef = doc(db, "_diagnostics", `test_${uid}`);
      
      const payload = {
        check: "connectivity_test",
        timestamp: Date.now(),
        uid: uid,
        client: "web-tester"
      };

      // A. Escritura (Usando lógica directa para el test, pero registramos la colección)
      const start = Date.now();
      await setDoc(docRef, payload);
      
      // REGISTRO AUTOMÁTICO PARA QUE APAREZCA EN EL ADMIN
      registerCollection(appInstance, '_diagnostics').catch(() => {});
      
      // B. Lectura (Verificación)
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw new Error("El documento se escribió pero no se pudo recuperar inmediatamente (Latency/Consistency issue).");
      }

      // C. Limpieza
      await deleteDoc(docRef);
      const end = Date.now();

      return {
        success: true,
        message: "Firestore Test Exitoso",
        data: {
          path: docPath,
          latency: `${end - start}ms`,
          status: "Write/Read/Delete OK"
        }
      };

    } catch (error: any) {
      throw error;
    }
  };

  try {
    // Race: Gana el que termine primero
    return await Promise.race([operationPromise(), timeoutPromise]);

  } catch (error: any) {
    let userMessage = "Error desconocido en Firestore.";
    let technicalDetails = error.message;

    if (error.message === "TIMEOUT_EXCEEDED") {
      userMessage = "Tiempo de espera agotado (5s). Verifica tu conexión o si el servicio Firestore está habilitado en la consola.";
    } else if (error.code === 'permission-denied') {
      userMessage = "Permiso denegado. Tus Reglas de Seguridad bloquean la escritura en '_diagnostics/{docId}'.";
      technicalDetails = "Tip: Agrega 'match /_diagnostics/{doc} { allow read, write: if request.auth != null; }' a tus reglas.";
    } else if (error.code === 'unavailable') {
      userMessage = "Servicio no disponible (Offline). Verifica tu conexión a internet.";
    } else if (error.code === 'not-found') {
      userMessage = "Colección o documento no encontrado (Error lógico).";
    }

    return {
      success: false,
      message: userMessage,
      error: technicalDetails
    };
  }
};
