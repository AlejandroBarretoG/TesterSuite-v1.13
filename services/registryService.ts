
import { getFirestore, doc, setDoc, getDoc, arrayUnion } from 'firebase/firestore';

const REGISTRY_COLLECTION = '_app_registry';
const MANIFEST_DOC = 'manifest';

export interface RegistryResult {
  success: boolean;
  collections?: string[];
  message?: string;
}

/**
 * Registers a collection name in the central manifest.
 * Fails silently to avoid blocking main application flow.
 */
export const registerCollection = async (appInstance: any, collectionName: string): Promise<void> => {
  if (!appInstance || !collectionName) return;
  
  // Ignore the registry collection itself to avoid recursion/clutter
  if (collectionName === REGISTRY_COLLECTION) return;

  try {
    const db = getFirestore(appInstance);
    const registryRef = doc(db, REGISTRY_COLLECTION, MANIFEST_DOC);

    // Use setDoc with merge: true to handle both creation and update atomically
    await setDoc(registryRef, {
      collectionNames: arrayUnion(collectionName),
      lastUpdated: Date.now()
    }, { merge: true });

  } catch (e) {
    console.warn(`[Registry] Failed to register collection '${collectionName}'. Check Firestore permissions.`, e);
  }
};

/**
 * Fetches the list of all registered collections.
 */
export const getRegisteredCollections = async (appInstance: any): Promise<RegistryResult> => {
  try {
    const db = getFirestore(appInstance);
    const registryRef = doc(db, REGISTRY_COLLECTION, MANIFEST_DOC);
    const snapshot = await getDoc(registryRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      const list = data.collectionNames || [];
      return { success: true, collections: list.sort() };
    }
    
    return { success: true, collections: [] };
  } catch (e: any) {
    console.error("[Registry] Error fetching collections:", e);
    return { success: false, message: e.message };
  }
};
