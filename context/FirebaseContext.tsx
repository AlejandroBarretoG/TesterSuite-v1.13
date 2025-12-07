import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FirebaseApp, Auth, User, FirebaseOptions, FirebaseContextType } from '../types';
import { testRealAuthConnection, mockSignOut } from '../services/firebase';

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

// Extractor seguro de configuración (reutilizado de App.tsx original)
const safeJsonParse = (input: string) => {
  try {
    const cleanInput = input.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    // Intenta parsear directo
    return JSON.parse(cleanInput);
  } catch (e) {
    // Si falla, intentamos extraer objeto JS (simplificado)
    const first = input.indexOf('{');
    const last = input.lastIndexOf('}');
    if (first !== -1 && last > first) {
       try {
         const objStr = input.substring(first, last + 1);
         return JSON.parse(objStr); // Asumimos que el usuario arregló el formato a JSON válido
       } catch(err) { return null; }
    }
    return null;
  }
};

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [app, setApp] = useState<FirebaseApp | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Auto-connect effect based on localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('firebase_config_input');
    if (savedConfig) {
      const parsed = safeJsonParse(savedConfig);
      if (parsed && parsed.apiKey) {
        initialize(parsed).catch(console.warn);
      }
    }
  }, []);

  const initialize = async (config: FirebaseOptions) => {
    try {
      // Usamos testRealAuthConnection porque inicializa la app Y el auth real
      const result = await testRealAuthConnection(config);
      
      if (result.success && result.app && result.auth) {
        setApp(result.app);
        setAuth(result.auth);
        
        // Listener de estado de autenticación
        if (typeof result.auth.onAuthStateChanged === 'function') {
           result.auth.onAuthStateChanged((u: User | null) => {
             setUser(u);
             setIsInitialized(true);
           });
        } else {
           // Fallback para mocks
           setUser(result.auth.currentUser);
           setIsInitialized(true);
        }
        return { success: true, message: "Firebase inicializado correctamente." };
      } else {
        return { success: false, message: result.message || "Error al inicializar." };
      }
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  const logout = async () => {
    if (auth) {
      if (typeof auth.signOut === 'function') {
        await auth.signOut();
      } else {
        await mockSignOut(app!); // Fallback
      }
      setUser(null);
    }
  };

  return (
    <FirebaseContext.Provider value={{ app, auth, user, isInitialized, initialize, logout }}>
      {children}
    </FirebaseContext.Provider>
  );
};
