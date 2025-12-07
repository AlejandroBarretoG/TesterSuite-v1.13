
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { registerCollection } from './registryService';

export interface FirestoreAdminResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const fetchDocuments = async (appInstance: any, collectionName: string): Promise<FirestoreAdminResult> => {
  try {
    const db = getFirestore(appInstance);
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const docs = snapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data()
    }));
    return { success: true, data: docs };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

export const createDocument = async (appInstance: any, collectionName: string, data: any): Promise<FirestoreAdminResult> => {
  try {
    const db = getFirestore(appInstance);
    const colRef = collection(db, collectionName);
    const docRef = await addDoc(colRef, data);
    
    // Auto-Register the collection
    registerCollection(appInstance, collectionName).catch(console.warn);

    return { success: true, data: { id: docRef.id } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

export const updateDocument = async (appInstance: any, collectionName: string, docId: string, data: any): Promise<FirestoreAdminResult> => {
  try {
    const db = getFirestore(appInstance);
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

export const deleteDocument = async (appInstance: any, collectionName: string, docId: string): Promise<FirestoreAdminResult> => {
  try {
    const db = getFirestore(appInstance);
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};
