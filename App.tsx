
import React, { useState, useEffect } from 'react';
import { initFirebase, getConfigDisplay, mockSignIn, testRealAuthConnection } from './services/firebase';
import { testStorageConnection } from './services/storage';
import { mockWriteUserData, mockGetUserData } from './services/firestore_mock';
import { testFirestoreConnection } from './services/firestore';
import { runGeminiTests } from './services/gemini';
import { FirebaseWizard } from './components/FirebaseWizard';
import { BillingWizard } from './components/BillingWizard';
import { RouterManager, AppMode } from './components/RouterManager';
import { FirebaseProvider } from './context/FirebaseContext';
import { Hammer, Smartphone, Layers, ChevronDown, Settings, X, Database, TestTube2, FileJson, Sparkles, Activity, HardDrive, Wand2, Map, Code2, KeyRound, ChevronUp, HelpCircle, CreditCard, UserCircle, Key, Cpu, FolderOpen, Table, Settings2, Aperture, Music, Image as ImageIcon } from 'lucide-react';

interface TestStep {
  id: string;
  title: string;
  description: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  details?: string;
}

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyB9IR6S_XDeHdqWQUsfwNE55S7LazuflOw",
  authDomain: "conexion-tester-suite.firebaseapp.com",
  projectId: "conexion-tester-suite",
  storageBucket: "conexion-tester-suite.firebasestorage.app",
  messagingSenderId: "1085453980210",
  appId: "1:1085453980210:web:3001b7acdea2d0c0e5a22b"
};

const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recomendado)' },
  { id: 'gemini-2.5-flash-lite-preview-02-05', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro' },
];

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
         const func = new Function(`return ${objStr}`);
         return func();
       } catch(err) { return null; }
    }
    return null;
  }
};

const MainLayout: React.FC = () => {
  // --- SUITE VISIBILITY STATE ---
  const [isSuiteOpen, setIsSuiteOpen] = useState(false);
  const [mode, setMode] = useState<AppMode>('firebase');
  
  // PERSISTENCIA LOCAL (Config Inputs)
  const [firebaseConfigInput, setFirebaseConfigInput] = useState<string>(() => {
    return localStorage.getItem('firebase_config_input') || JSON.stringify(DEFAULT_FIREBASE_CONFIG, null, 2);
  });
  const [testUid, setTestUid] = useState<string>('test-user-123');
  const [showConfig, setShowConfig] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  
  // Gemini State
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('gemini_api_key') || DEFAULT_FIREBASE_CONFIG.apiKey;
  });
  const [geminiModel, setGeminiModel] = useState<string>(() => {
    return localStorage.getItem('gemini_model') || GEMINI_MODELS[0].id;
  });
  const [showBillingWizard, setShowBillingWizard] = useState(false);

  // EFECTOS DE PERSISTENCIA
  useEffect(() => { localStorage.setItem('firebase_config_input', firebaseConfigInput); }, [firebaseConfigInput]);
  useEffect(() => { localStorage.setItem('gemini_api_key', geminiApiKey); }, [geminiApiKey]);
  useEffect(() => { localStorage.setItem('gemini_model', geminiModel); }, [geminiModel]);

  // TEST STEPS STATE
  const [firebaseSteps, setFirebaseSteps] = useState<TestStep[]>([
    { id: 'config', title: 'Validación de Configuración', description: 'Analizando el JSON proporcionado.', status: 'idle' },
    { id: 'init', title: 'Inicialización del SDK', description: 'Ejecutando initializeApp() con la configuración.', status: 'idle' },
    { id: 'auth_module', title: 'Servicio de Autenticación', description: 'Verificando la instanciación del módulo Auth.', status: 'idle' },
    { id: 'auth_login', title: 'Simulación de Login', description: 'Estableciendo usuario activo (UID).', status: 'idle' },
    { id: 'db_write', title: 'Escritura Protegida (BD)', description: 'Guardando datos en /users/{uid}/data.', status: 'idle' },
    { id: 'db_read', title: 'Lectura Protegida (BD)', description: 'Recuperando datos propios del usuario.', status: 'idle' },
    { id: 'real_auth_test', title: 'Prueba de Conexión REAL (Auth)', description: 'Intentando signInAnonymously() contra el servidor.', status: 'idle' },
    { id: 'firestore_real', title: 'Prueba de Firestore REAL', description: 'Escritura/Lectura real en Cloud Firestore.', status: 'idle' },
    { id: 'storage_test', title: 'Prueba de Storage REAL', description: 'Subir/Bajar archivo (Timeout 5s).', status: 'idle' }
  ]);

  const [geminiSteps, setGeminiSteps] = useState<TestStep[]>([
    { id: 'connect', title: 'Verificación de API Key', description: 'Intentando establecer conexión inicial con Gemini.', status: 'idle' },
    { id: 'text', title: 'Generación de Texto', description: 'Prompt simple "Hola mundo".', status: 'idle' },
    { id: 'stream', title: 'Prueba de Streaming', description: 'Verificando recepción de chunks en tiempo real.', status: 'idle' },
    { id: 'tokens', title: 'Conteo de Tokens', description: 'Verificando endpoint countTokens.', status: 'idle' },
    { id: 'vision', title: 'Capacidad Multimodal', description: 'Analizando imagen de prueba (Pixel).', status: 'idle' },
    { id: 'system', title: 'Instrucciones del Sistema', description: 'Probando comportamiento de systemInstruction.', status: 'idle' },
    { id: 'embed', title: 'Embeddings', description: 'Generando vector con text-embedding-004.', status: 'idle' }
  ]);

  const [localSteps, setLocalSteps] = useState<TestStep[]>([
    { id: 'support', title: 'Soporte del Navegador', description: 'Verificando disponibilidad de window.localStorage.', status: 'idle' },
    { id: 'write', title: 'Prueba de Escritura', description: 'Intentando guardar un valor de prueba.', status: 'idle' },
    { id: 'read', title: 'Prueba de Lectura', description: 'Leyendo y validando integridad del dato.', status: 'idle' },
    { id: 'persistence', title: 'Verificación de Persistencia', description: 'Buscando configuración guardada anteriormente.', status: 'idle' },
    { id: 'clean', title: 'Limpieza', description: 'Eliminando datos de prueba.', status: 'idle' },
    { id: 'quota', title: 'Estimación de Uso', description: 'Calculando tamaño total almacenado.', status: 'idle' }
  ]);

  const updateStep = (mode: AppMode, id: string, updates: Partial<TestStep>) => {
    if (mode === 'firebase') setFirebaseSteps(prev => prev.map(s => stepReducer(s, id, updates)));
    else if (mode === 'gemini') setGeminiSteps(prev => prev.map(s => stepReducer(s, id, updates)));
    else if (mode === 'local') setLocalSteps(prev => prev.map(s => stepReducer(s, id, updates)));
  };

  const stepReducer = (step: TestStep, id: string, updates: Partial<TestStep>) => 
    step.id === id ? { ...step, ...updates } : step;

  // --- LOGIC: FIREBASE TESTS ---
  const runFirebaseTests = async () => {
    setFirebaseSteps(prev => prev.map(s => ({ ...s, status: 'idle', details: undefined })));
    
    updateStep('firebase', 'config', { status: 'loading' });
    await new Promise(resolve => setTimeout(resolve, 400));
    
    let parsedConfig: any;
    try {
      parsedConfig = safeJsonParse(firebaseConfigInput);
      if (!parsedConfig || !parsedConfig.apiKey) throw new Error("Configuración inválida o incompleta.");
      updateStep('firebase', 'config', { status: 'success', details: JSON.stringify(getConfigDisplay(parsedConfig), null, 2) });
    } catch (e: any) {
      updateStep('firebase', 'config', { status: 'error', details: e.message });
      return;
    }

    // Mock Init
    updateStep('firebase', 'init', { status: 'loading' });
    const result = await initFirebase(parsedConfig);
    if (result.success && result.app) {
      updateStep('firebase', 'init', { status: 'success', details: `App Name: "${result.app.name}"` });
    } else {
      updateStep('firebase', 'init', { status: 'error', details: result.message });
      return;
    }

    updateStep('firebase', 'auth_module', { status: 'loading' });
    if (result.auth) updateStep('firebase', 'auth_module', { status: 'success', details: 'Auth SDK (Mock) OK' });
    else return;

    // Mock Login
    updateStep('firebase', 'auth_login', { status: 'loading' });
    try {
      const authResult = await mockSignIn(testUid, result.app!);
      updateStep('firebase', 'auth_login', { status: 'success', details: `UID: ${authResult.currentUser?.uid}` });
    } catch (e: any) {
      updateStep('firebase', 'auth_login', { status: 'error', details: e.message });
      return;
    }

    // Mock DB Ops
    updateStep('firebase', 'db_write', { status: 'loading' });
    try {
      await mockWriteUserData(testUid, 'test_doc', { foo: 'bar' });
      updateStep('firebase', 'db_write', { status: 'success', details: 'Escritura Mock OK' });
    } catch (e: any) { updateStep('firebase', 'db_write', { status: 'error', details: e.message }); return; }

    updateStep('firebase', 'db_read', { status: 'loading' });
    try {
      await mockGetUserData(testUid, 'test_doc');
      updateStep('firebase', 'db_read', { status: 'success', details: 'Lectura Mock OK' });
    } catch (e: any) { updateStep('firebase', 'db_read', { status: 'error', details: e.message }); }

    // Real Connection
    updateStep('firebase', 'real_auth_test', { status: 'loading' });
    const realAuthResult = await testRealAuthConnection(parsedConfig);
    if (realAuthResult.success && realAuthResult.auth) {
      updateStep('firebase', 'real_auth_test', { status: 'success', details: `Conectado a Firebase Auth Real. UID: ${realAuthResult.data?.uid}` });
    } else {
      updateStep('firebase', 'real_auth_test', { status: 'error', details: realAuthResult.message });
      return;
    }

    // Real Firestore
    updateStep('firebase', 'firestore_real', { status: 'loading' });
    if (realAuthResult.app && realAuthResult.data?.uid) {
      const fsResult = await testFirestoreConnection(realAuthResult.app, realAuthResult.data.uid);
      if (fsResult.success) updateStep('firebase', 'firestore_real', { status: 'success', details: fsResult.message });
      else updateStep('firebase', 'firestore_real', { status: 'error', details: fsResult.message });
    }

    // Real Storage
    updateStep('firebase', 'storage_test', { status: 'loading' });
    if (realAuthResult.app) {
      const stResult = await testStorageConnection(realAuthResult.app);
      if (stResult.success) updateStep('firebase', 'storage_test', { status: 'success', details: stResult.message });
      else updateStep('firebase', 'storage_test', { status: 'error', details: stResult.message });
    }
  };

  // --- LOGIC: GEMINI TESTS ---
  const runGeminiTestFlow = async () => {
    setGeminiSteps(prev => prev.map(s => ({ ...s, status: 'idle', details: undefined })));
    if (!geminiApiKey.trim()) {
      updateStep('gemini', 'connect', { status: 'error', details: "API Key requerida" });
      return;
    }

    // Execute sequential tests...
    // 1. Connect
    updateStep('gemini', 'connect', { status: 'loading' });
    const cRes = await runGeminiTests.connect(geminiApiKey, geminiModel);
    if(cRes.success) updateStep('gemini', 'connect', { status: 'success', details: 'Connected' });
    else { updateStep('gemini', 'connect', { status: 'error', details: cRes.message }); return; }

    // 2. Text
    updateStep('gemini', 'text', { status: 'loading' });
    const tRes = await runGeminiTests.generateText(geminiApiKey, geminiModel);
    if(tRes.success) updateStep('gemini', 'text', { status: 'success', details: 'OK' });
    else updateStep('gemini', 'text', { status: 'error', details: tRes.message });

    // 3. Stream
    updateStep('gemini', 'stream', { status: 'loading' });
    const sRes = await runGeminiTests.streamText(geminiApiKey, geminiModel);
    if(sRes.success) updateStep('gemini', 'stream', { status: 'success', details: 'OK' });
    else updateStep('gemini', 'stream', { status: 'error', details: sRes.message });

    // 4. Tokens
    updateStep('gemini', 'tokens', { status: 'loading' });
    const tkRes = await runGeminiTests.countTokens(geminiApiKey, geminiModel);
    if(tkRes.success) updateStep('gemini', 'tokens', { status: 'success', details: 'OK' });
    else updateStep('gemini', 'tokens', { status: 'error', details: tkRes.message });

    // 5. Vision
    updateStep('gemini', 'vision', { status: 'loading' });
    const vRes = await runGeminiTests.vision(geminiApiKey, geminiModel);
    if(vRes.success) updateStep('gemini', 'vision', { status: 'success', details: 'OK' });
    else updateStep('gemini', 'vision', { status: 'error', details: vRes.message });

    // 6. System
    updateStep('gemini', 'system', { status: 'loading' });
    const sysRes = await runGeminiTests.systemInstruction(geminiApiKey, geminiModel);
    if(sysRes.success) updateStep('gemini', 'system', { status: 'success', details: 'OK' });
    else updateStep('gemini', 'system', { status: 'error', details: sysRes.message });

    // 7. Embed
    updateStep('gemini', 'embed', { status: 'loading' });
    const eRes = await runGeminiTests.embedding(geminiApiKey);
    if(eRes.success) updateStep('gemini', 'embed', { status: 'success', details: 'OK' });
    else updateStep('gemini', 'embed', { status: 'error', details: eRes.message });
  };

  // --- LOGIC: LOCAL TESTS ---
  const runLocalTestsAction = async () => {
    setLocalSteps(prev => prev.map(s => ({ ...s, status: 'idle', details: undefined })));
    updateStep('local', 'support', { status: 'loading' });
    await new Promise(r => setTimeout(r, 300));
    
    if (typeof window !== 'undefined' && window.localStorage) updateStep('local', 'support', { status: 'success', details: 'OK' });
    else { updateStep('local', 'support', { status: 'error', details: 'No localStorage' }); return; }

    updateStep('local', 'write', { status: 'loading' });
    try { localStorage.setItem('test', '1'); updateStep('local', 'write', { status: 'success', details: 'OK' }); }
    catch(e: any) { updateStep('local', 'write', { status: 'error', details: e.message }); return; }

    updateStep('local', 'read', { status: 'loading' });
    if(localStorage.getItem('test') === '1') updateStep('local', 'read', { status: 'success', details: 'OK' });
    else updateStep('local', 'read', { status: 'error', details: 'Mismatch' });

    updateStep('local', 'persistence', { status: 'loading' });
    if(localStorage.getItem('firebase_config_input')) updateStep('local', 'persistence', { status: 'success', details: 'Found Config' });
    else updateStep('local', 'persistence', { status: 'success', details: 'No Config' });

    updateStep('local', 'clean', { status: 'loading' });
    localStorage.removeItem('test');
    updateStep('local', 'clean', { status: 'success', details: 'OK' });

    updateStep('local', 'quota', { status: 'loading' });
    updateStep('local', 'quota', { status: 'success', details: 'Calculated' });
  };

  const getPageTitle = () => {
    switch(mode) {
      case 'firebase': return 'Firebase Connection Test';
      case 'gemini': return 'Gemini API Diagnostics';
      case 'auth_lab': return 'Auth Lab';
      case 'roadmap': return 'Roadmap Tecnológico';
      case 'voice_lab': return 'Laboratorio de Voz';
      case 'db_admin': return 'DB Admin';
      case 'prompt_manager': return 'Prompt Architect';
      case 'storage': return 'Storage Lab';
      case 'sheets': return 'Sheets Lab';
      case 'json_admin': return 'JSON Admin (Beta)';
      case 'live_vision': return 'Gemini Vision Live';
      case 'synth_lab': return 'Synth Lab';
      case 'image_lab': return 'Image Lab';
      default: return 'Diagnóstico Local';
    }
  };

  const shouldHideConfig = (m: AppMode) => 
    m !== 'firebase' && m !== 'gemini' && m !== 'local';

  return (
    <div className="min-h-screen bg-slate-100 font-sans relative overflow-hidden">
      
      {/* 1. THE "REAL" APP PLACEHOLDER */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-0">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-200 text-center max-w-2xl transform transition-all hover:scale-[1.01] hover:shadow-2xl group">
           <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
              <Hammer className="text-white w-12 h-12" />
           </div>
           <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Tu Nuevo Proyecto</h1>
           <p className="text-lg text-slate-500 mb-8 leading-relaxed">
             Lienzo en blanco. Las herramientas de diagnóstico ahora viven en la <strong>Consola de Desarrollo</strong>.
           </p>
           <div className="flex gap-4 justify-center">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium"><Smartphone size={16} /> Mobile First</div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium"><Layers size={16} /> Scalable Arch</div>
           </div>
           <div className="mt-12 animate-bounce text-slate-400 text-sm flex flex-col items-center gap-2"><span>Abre las herramientas abajo</span><ChevronDown /></div>
        </div>
      </div>

      {/* 2. FAB */}
      <button onClick={() => setIsSuiteOpen(true)} className="fixed bottom-6 right-6 z-[50] bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 hover:scale-110 transition-all duration-300 group">
        <Settings size={28} className="group-hover:rotate-90 transition-transform duration-500" />
      </button>

      {/* 3. DIAGNOSTIC SUITE OVERLAY */}
      {isSuiteOpen && (
        <div className="fixed inset-0 z-[90] bg-slate-50/95 backdrop-blur-sm overflow-auto animate-in slide-in-from-bottom-10 fade-in duration-300">
          <button onClick={() => setIsSuiteOpen(false)} className="fixed top-6 right-6 z-[100] bg-white p-2 rounded-full shadow-md border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors">
            <X size={24} />
          </button>

          <div className="min-h-screen p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
              <FirebaseWizard isOpen={showWizard} onClose={() => setShowWizard(false)} />
              <BillingWizard isOpen={showBillingWizard} onClose={() => setShowBillingWizard(false)} />

              {/* Header & Tabs */}
              <div className="mb-8 text-center relative">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider mb-4">DevTools Console</span>
                <div className="flex justify-start md:justify-center mb-6 overflow-x-auto pb-4 -mx-6 px-6 md:mx-0 md:px-0">
                  <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex whitespace-nowrap">
                    {[
                      { id: 'firebase', label: 'Firebase', icon: Database, color: 'orange' },
                      { id: 'auth_lab', label: 'Auth Lab', icon: TestTube2, color: 'teal' },
                      { id: 'db_admin', label: 'DB Admin', icon: FileJson, color: 'emerald' },
                      { id: 'storage', label: 'Storage', icon: FolderOpen, color: 'blue' },
                      { id: 'sheets', label: 'Sheets', icon: Table, color: 'green' },
                      { id: 'json_admin', label: 'JSON Admin', icon: Settings2, color: 'indigo' },
                      { id: 'gemini', label: 'Gemini AI', icon: Sparkles, color: 'blue' },
                      { id: 'live_vision', label: 'Vision', icon: Aperture, color: 'teal' },
                      { id: 'voice_lab', label: 'Voice Lab', icon: Activity, color: 'cyan' },
                      { id: 'synth_lab', label: 'Synth Lab', icon: Music, color: 'purple' },
                      { id: 'image_lab', label: 'Image Lab', icon: ImageIcon, color: 'pink' },
                      { id: 'local', label: 'Local', icon: HardDrive, color: 'purple' },
                      { id: 'prompt_manager', label: 'Prompt', icon: Wand2, color: 'indigo' },
                      { id: 'roadmap', label: 'Roadmap', icon: Map, color: 'indigo' }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setMode(tab.id as AppMode)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          mode === tab.id ? `bg-${tab.color}-100 text-${tab.color}-700` : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <tab.icon size={16} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-slate-900">{getPageTitle()}</h1>
              </div>

              {/* Configuration Section (Collapsible) */}
              {!shouldHideConfig(mode) && (
                <div className="mb-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
                    <button onClick={() => setShowConfig(!showConfig)} className="flex items-center gap-2 text-slate-800 font-medium hover:text-slate-900 transition-colors">
                      {mode === 'firebase' ? <Code2 size={20} className="text-orange-500" /> : <KeyRound size={20} className="text-blue-500" />}
                      {mode === 'firebase' ? 'Configuración Firebase & Auth' : 'Configuración Gemini'}
                      {showConfig ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>
                    {mode === 'firebase' && showConfig && (
                      <button onClick={() => setShowWizard(true)} className="text-xs flex items-center gap-1.5 text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100"><HelpCircle size={14} /> Guía</button>
                    )}
                    {mode === 'gemini' && showConfig && (
                      <button onClick={() => setShowBillingWizard(true)} className="text-xs flex items-center gap-1.5 text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100"><CreditCard size={14} /> Facturación</button>
                    )}
                  </div>
                  
                  {showConfig && (
                    <div className="p-4">
                      {mode === 'firebase' ? (
                        <div className="space-y-4">
                          <textarea
                            value={firebaseConfigInput}
                            onChange={(e) => setFirebaseConfigInput(e.target.value)}
                            className="w-full h-32 p-4 font-mono text-xs bg-slate-900 text-green-400 rounded-lg outline-none resize-y"
                          />
                          <div className="pt-4 border-t border-slate-100">
                             <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><UserCircle size={16} /> UID de Prueba</label>
                             <input type="text" value={testUid} onChange={(e) => setTestUid(e.target.value)} className="w-full p-2 text-sm bg-slate-50 border rounded-lg" />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2"><Key size={16} /> Gemini API Key</label>
                             <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} className="w-full p-2 text-sm border rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                            <div className="relative">
                              <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} className="w-full p-3 border rounded-lg appearance-none bg-white"><option value="gemini-2.5-flash">Flash 2.5</option></select>
                              <Cpu className="absolute right-3 top-3 text-slate-400" size={18} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* --- ROUTER MANAGER HANDLES THE VIEWS --- */}
              <RouterManager 
                mode={mode}
                runFirebaseTests={runFirebaseTests}
                runGeminiTests={runGeminiTestFlow}
                runLocalTests={runLocalTestsAction}
                firebaseSteps={firebaseSteps}
                geminiSteps={geminiSteps}
                localSteps={localSteps}
              />

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <FirebaseProvider>
      <MainLayout />
    </FirebaseProvider>
  );
};

export default App;
