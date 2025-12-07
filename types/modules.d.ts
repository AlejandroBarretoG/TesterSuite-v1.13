
// Definiciones ambientales para módulos cargados vía Import Maps (CDN)

declare module 'firebase/app' {
  export interface FirebaseApp {
    name: string;
    options: any;
  }
  export function initializeApp(config: any, name?: string): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function getApp(name?: string): FirebaseApp;
}

declare module 'firebase/auth' {
  export function getAuth(app?: any): any;
  export function signInAnonymously(auth: any): Promise<any>;
  export function signInWithEmailAndPassword(auth: any, email: string, password: string): Promise<any>;
  export function linkWithCredential(user: any, credential: any): Promise<any>;
  export function sendPasswordResetEmail(auth: any, email: string): Promise<void>;
  export function signOut(auth: any): Promise<void>;
  export function setPersistence(auth: any, persistence: any): Promise<void>;
  export const browserLocalPersistence: any;
  export class EmailAuthProvider {
    static credential(email: string, password: string): any;
  }
}

declare module 'firebase/firestore' {
  export function getFirestore(app?: any): any;
  export function collection(firestore: any, path: string): any;
  export function doc(firestore: any, path: string, ...pathSegments: string[]): any;
  export function addDoc(reference: any, data: any): Promise<any>;
  export function setDoc(reference: any, data: any, options?: { merge: boolean }): Promise<void>;
  export function getDoc(reference: any): Promise<any>;
  export function getDocs(query: any): Promise<any>;
  export function updateDoc(reference: any, data: any): Promise<void>;
  export function deleteDoc(reference: any): Promise<void>;
  export function arrayUnion(...elements: any[]): any;
}

declare module 'firebase/storage' {
  export function getStorage(app?: any): any;
  export function ref(storage: any, url?: string): any;
  export function uploadString(ref: any, value: string, format?: string, metadata?: any): Promise<any>;
  export function uploadBytesResumable(ref: any, data: any, metadata?: any): any;
  export function getDownloadURL(ref: any): Promise<string>;
  export function deleteObject(ref: any): Promise<void>;
  export function listAll(ref: any): Promise<any>;
  export function getMetadata(ref: any): Promise<any>;
  export function getBytes(ref: any): Promise<ArrayBuffer>;
}

declare module 'tone' {
  export const Destination: any;
  export const Transport: any;
  export class Synth { constructor(options?: any); toDestination(): any; }
  export class FMSynth { constructor(options?: any); toDestination(): any; }
  export class AMSynth { constructor(options?: any); toDestination(): any; }
  export class MembraneSynth { constructor(options?: any); toDestination(): any; }
  export class DuoSynth { constructor(options?: any); toDestination(): any; }
  export class PolySynth { constructor(voice?: any); toDestination(): any; triggerAttackRelease(notes: any, duration: any, time?: any): void; volume: any; }
  export class Part { constructor(callback: any, events: any); start(time: any): void; stop(): void; }
  export class Recorder { constructor(); start(): void; stop(): Promise<Blob>; }
  export function start(): Promise<void>;
}
