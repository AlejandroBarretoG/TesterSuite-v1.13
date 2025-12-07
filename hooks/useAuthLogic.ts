import { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  linkWithCredential, 
  EmailAuthProvider 
} from '../services/firebase';
import { useFirebase } from '../context/FirebaseContext';
import { User } from '../types';

/**
 * @ai-capability AUTH_HOOK
 * Hook centralizado para lógica de autenticación.
 * Ahora consume el contexto automáticamente, no requiere pasar la instancia.
 */
export const useAuthLogic = () => {
  const { auth, user, logout: contextLogout } = useFirebase();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const clearState = () => {
    setStatus('idle');
    setMessage('');
    setErrorDetail(null);
  };

  const login = async (email, password) => {
    if (!auth) {
      setMessage("Firebase Auth no está inicializado.");
      return;
    }
    
    setStatus('loading');
    setMessage('');
    setErrorDetail(null);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setStatus('success');
      // No seteamos mensaje de éxito aquí porque usualmente redirige o cambia la UI
    } catch (error: any) {
      setStatus('error');
      
      if (error.code === 'auth/wrong-password') {
        setMessage('Contraseña incorrecta.');
      } else if (error.code === 'auth/user-not-found') {
        setMessage('No existe cuenta registrada con este email.');
      } else if (error.code === 'auth/invalid-email') {
        setMessage('Email inválido.');
      } else if (error.code === 'auth/too-many-requests') {
        setMessage('Demasiados intentos fallidos. Intenta más tarde.');
      } else {
        setMessage(error.message || 'Error al iniciar sesión.');
      }
    }
  };

  const resetPassword = async (email) => {
    if (!auth) return;
    setStatus('loading');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setStatus('success');
      setMessage(`Correo de recuperación enviado a ${email}. Revisa tu bandeja de entrada.`);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || "Error al enviar correo.");
    }
  };

  /**
   * Vincula una cuenta anónima a credenciales permanentes.
   */
  const linkAccount = async (email, password, onConflict?: () => void) => {
     if (!auth || !user) return;
     setStatus('loading');
     setMessage('');
     setErrorDetail(null);

     try {
       const credential = EmailAuthProvider.credential(email, password);
       // Casting necesario porque nuestras interfaces locales son simplificadas
       await linkWithCredential(user as any, credential);
       setStatus('success');
       setMessage('¡Cuenta vinculada exitosamente! Tu usuario anónimo ahora es permanente.');
       return true; 
     } catch (error: any) {
       setStatus('error');
       
       if (error.code === 'auth/credential-already-in-use') {
        setMessage('Esta cuenta de correo ya está asociada a otro usuario.');
        if (onConflict) onConflict();
      } else if (error.code === 'auth/operation-not-allowed') {
        setMessage('El proveedor Email/Password no está habilitado.');
        setErrorDetail('Ve a Firebase Console > Authentication > Sign-in method y habilita "Correo electrónico/contraseña".');
      } else if (error.code === 'auth/weak-password') {
        setMessage('La contraseña es demasiado débil. Usa al menos 6 caracteres.');
      } else {
        setMessage(error.message || 'Error al vincular cuenta.');
      }
      return false;
     }
  };

  return {
    status,
    message,
    errorDetail,
    clearState,
    login,
    logout: contextLogout,
    resetPassword,
    linkAccount
  };
};
