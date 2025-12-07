import React, { useState, useEffect } from 'react';
import { Shield, Mail, Link as LinkIcon, AlertTriangle, CheckCircle2, UserCircle2, ArrowRight, RefreshCw, AlertCircle, HelpCircle, Settings, ExternalLink, LogOut, ArrowLeft, LogIn } from 'lucide-react';
import { useAuthLogic } from '../hooks/useAuthLogic';
import { useFirebase } from '../context/FirebaseContext';

type AuthMode = 'link' | 'login' | 'reset';

export const AuthLab: React.FC = () => {
  const { auth, user } = useFirebase();
  const { status, message, errorDetail, clearState, login, logout, resetPassword, linkAccount } = useAuthLogic();

  // Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI State
  const [mode, setMode] = useState<AuthMode>('login');
  const [showConflictModal, setShowConflictModal] = useState(false);

  // Sync mode with user state changes
  useEffect(() => {
    if (user) {
      if (user.isAnonymous) {
        setMode('link'); // Default action for anon is link
      } else {
        setMode('link'); // Logged in permanent user view handled by separate return
      }
    } else {
      setMode('login'); // Default for no user
    }
    clearState();
    setEmail('');
    setPassword('');
  }, [user]); // Re-run when user changes

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearState();
    // Only clear inputs if switching to reset, keep them if switching between login/link for convenience
    if (newMode === 'reset') setPassword('');
  };

  const onLogin = async () => {
    if (!email || !password) return;
    await login(email, password);
  };

  const onResetPassword = async () => {
    if (!email) return;
    await resetPassword(email);
  };

  const onLinkAccount = async () => {
    if (!user || !email || !password) return;
    const success = await linkAccount(email, password, () => setShowConflictModal(true));
    if (success) setPassword('');
  };

  if (!auth) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200 border-dashed animate-in fade-in">
        <div className="bg-slate-50 p-4 rounded-full mb-4">
          <Shield className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Laboratorio de Autenticación Inactivo</h3>
        <p className="text-slate-500 max-w-md mt-2 mb-6">
          Para usar este laboratorio, primero debes ejecutar el <strong>Diagnóstico de Firebase</strong> y obtener una conexión REAL exitosa.
        </p>
      </div>
    );
  }

  // --- RENDER HELPERS ---
  const renderUserInfo = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <UserCircle2 className="text-blue-500" size={20} />
          {user ? "Sesión Activa" : "Sin Sesión"}
        </h2>
        {user ? (
          user.isAnonymous ? (
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full border border-orange-200">
              ANÓNIMO
            </span>
          ) : (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200">
              VERIFICADO
            </span>
          )
        ) : (
          <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">
            DESCONECTADO
          </span>
        )}
      </div>
      <div className="p-6">
        {user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Firebase UID</label>
              <div className="font-mono text-xs md:text-sm bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                {user.uid}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</label>
                <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Mail size={16} className="text-slate-400" />
                  {user.email || 'Sin email (Cuenta Anónima)'}
                </div>
              </div>
              <button 
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-2 transition-colors w-full md:w-auto justify-center md:justify-start"
              >
                <LogOut size={16} /> Cerrar Sesión
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2 text-slate-500 text-sm">
            No hay ningún usuario conectado actualmente. Inicia sesión para continuar.
          </div>
        )}
      </div>
    </div>
  );

  // SCENARIO 1: USER IS PERMANENT/VERIFIED
  if (user && !user.isAnonymous) {
    return (
      <div className="space-y-6 animate-in fade-in">
        {renderUserInfo()}
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} />
          </div>
          <h3 className="text-xl font-bold text-green-800">¡Cuenta Segura!</h3>
          <p className="text-green-700 mt-2 max-w-lg mx-auto">
            Estás autenticado como <strong>{user.email}</strong>. Tu cuenta es permanente.
          </p>
        </div>
      </div>
    );
  }

  // SCENARIO 2 & 3: ANONYMOUS OR LOGGED OUT
  return (
    <div className="space-y-6 animate-in fade-in">
      {renderUserInfo()}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* TAB NAVIGATION FOR ANONYMOUS USER */}
        {user?.isAnonymous && (
           <div className="flex border-b border-slate-100">
             <button
               onClick={() => switchMode('link')}
               className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                 mode === 'link' ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50' : 'text-slate-500 hover:bg-slate-50'
               }`}
             >
               <LinkIcon size={16} /> Vincular (Guardar Datos)
             </button>
             <button
               onClick={() => switchMode('login')}
               className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                 mode === 'login' || mode === 'reset' ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'
               }`}
             >
               <LogIn size={16} /> Cambiar Cuenta
             </button>
           </div>
        )}

        {/* FORMS CONTENT */}
        <div className="p-6">
          {mode === 'reset' ? (
             <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-4">
               <button 
                 onClick={() => switchMode('login')}
                 className="mb-4 text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1"
               >
                 <ArrowLeft size={12} /> Volver al Login
               </button>
               <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                 <HelpCircle className="text-blue-500" size={20} /> Recuperar Contraseña
               </h3>
               
               <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                 </div>
                 <button
                    onClick={onResetPassword}
                    disabled={status === 'loading' || !email}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                     {status === 'loading' ? <RefreshCw className="animate-spin" size={18} /> : 'Enviar Correo'}
                  </button>
               </div>
             </div>

          ) : mode === 'login' ? (
            <div className="max-w-md mx-auto animate-in fade-in">
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <LogIn className="text-blue-500" size={20} /> Iniciar Sesión
              </h3>
              {user?.isAnonymous && (
                 <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs mb-4 border border-red-100 flex gap-2 items-start">
                   <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                   <p>Advertencia: Al iniciar sesión en otra cuenta, <strong>perderás el acceso a este usuario anónimo</strong> y sus datos temporales.</p>
                 </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Contraseña</label>
                    <button 
                      onClick={() => switchMode('reset')}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <LockIcon />
                    <input 
                      type="password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={onLogin}
                  disabled={status === 'loading' || !email || !password}
                  className="mt-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all"
                >
                   {status === 'loading' ? <RefreshCw className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                   Entrar
                </button>
              </div>
            </div>

          ) : (
            <div className="max-w-md mx-auto animate-in fade-in">
              <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <LinkIcon className="text-orange-500" size={20} /> Convertir a Permanente
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                Crea una contraseña para tu ID actual (<strong>{user?.uid.substring(0,8)}...</strong>). Esto guardará tu progreso.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="usuario@ejemplo.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Contraseña Nueva</label>
                  <div className="relative">
                    <LockIcon />
                    <input 
                      type="password" 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={onLinkAccount}
                  disabled={status === 'loading' || !email || !password}
                  className="mt-2 w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all"
                >
                   {status === 'loading' ? <RefreshCw className="animate-spin" size={18} /> : <Shield size={18} />}
                   Vincular Cuenta
                </button>
              </div>
            </div>
          )}

          {/* FEEDBACK & MODAL */}
          {message && status !== 'loading' && !showConflictModal && (
            <div className={`mt-6 p-4 rounded-lg flex flex-col gap-1 text-sm animate-in slide-in-from-bottom-2 ${
              status === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-100 text-green-800 border border-green-200'
            }`}>
              <div className="flex items-start gap-2 font-medium">
                {status === 'error' ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
                <span>{message}</span>
              </div>
              
              {errorDetail && (
                <div className="ml-6 mt-1 text-xs bg-white/50 p-2 rounded border border-red-200/50">
                  <p className="mb-2 font-semibold flex items-center gap-1">
                    <Settings size={12} /> Acción Requerida:
                  </p>
                  <p>{errorDetail}</p>
                  <a 
                    href="https://console.firebase.google.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    Ir a Firebase Console <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showConflictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-red-50 p-6 border-b border-red-100 flex items-start gap-4">
               <div className="p-3 bg-red-100 rounded-full text-red-600 shrink-0">
                 <AlertTriangle size={24} />
               </div>
               <div>
                 <h3 className="text-lg font-bold text-slate-900">Correo ya registrado</h3>
                 <p className="text-sm text-slate-600 mt-1">
                   El correo <strong>{email}</strong> ya existe.
                 </p>
               </div>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                No se puede vincular porque ya existe una cuenta con este email. ¿Deseas iniciar sesión en ella? (Perderás los datos de este usuario anónimo).
              </p>
              <div className="flex gap-3">
                 <button 
                  onClick={() => {
                    setShowConflictModal(false);
                    switchMode('login');
                  }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Ir al Login
                </button>
                <button 
                  onClick={() => {
                    setShowConflictModal(false);
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LockIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="18" height="18" viewBox="0 0 24 24" 
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="absolute left-3 top-3 text-slate-400"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);
