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

export interface User {
  uid: string;
  isAnonymous: boolean;
  email: string | null;
  metadata?: any;
}

export interface Auth {
  app: FirebaseApp;
  currentUser: User | null;
  [key: string]: any; // Allow for internal Firebase methods
}

export interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  user: User | null;
  isInitialized: boolean;
  initialize: (config: FirebaseOptions) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}
