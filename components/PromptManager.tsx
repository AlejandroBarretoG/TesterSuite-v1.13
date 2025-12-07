
import React, { useState, useEffect } from 'react';
import { Copy, Terminal, Wand2, ArrowRight, Check, Sparkles, FileText, Save, Clock, History, Loader2, Braces } from 'lucide-react';
import { PROJECT_CAPABILITIES } from '../AI_CONTEXT';
import { useFirebase } from '../context/FirebaseContext';
import { smartAddDoc } from '../services/firestore';
import { fetchDocuments } from '../services/firestoreAdmin';

export const PromptManager: React.FC = () => {
  const { app } = useFirebase();
  const [userInput, setUserInput] = useState('');
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Dynamic Variables
  const [variables, setVariables] = useState<Record<string, string>>({});
  
  // Persistence States
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (app) loadHistory();
  }, [app]);

  // Regex Detection for {{variable}}
  useEffect(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = Array.from(userInput.matchAll(regex)).map(m => m[1]);
    const uniqueVars = Array.from(new Set(matches));
    
    setVariables(prev => {
      const newVars = { ...prev };
      // Remove unused
      Object.keys(newVars).forEach(k => {
        if (!uniqueVars.includes(k)) delete newVars[k];
      });
      // Add new
      uniqueVars.forEach(v => {
        if (newVars[v] === undefined) newVars[v] = '';
      });
      return newVars;
    });
  }, [userInput]);

  const loadHistory = async () => {
    if (!app) return;
    setLoadingHistory(true);
    const res = await fetchDocuments(app, 'saved_prompts');
    if (res.success && res.data) {
      // Sort by createdAt descending (client-side since we use simple fetch)
      const sorted = res.data.sort((a:any, b:any) => (b.createdAt || 0) - (a.createdAt || 0));
      setHistory(sorted);
    }
    setLoadingHistory(false);
  };

  const generatePrompt = () => {
    if (!userInput.trim()) return;

    // Apply variable substitution
    let processedInput = userInput;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedInput = processedInput.replace(regex, value || `[${key}]`);
    });

    // Construcción del Prompt Estructurado basado en tu Referencia
    const contextBlock = `
--- CONTEXTO DEL PROYECTO (OBLIGATORIO) ---
Consulta el archivo 'AI_CONTEXT.ts' para la arquitectura base.

1. MAPA DE COMPONENTES:
   - Autenticación: ${PROJECT_CAPABILITIES.auth}
   - Base de Datos: ${PROJECT_CAPABILITIES.db}
   - UI System: ${PROJECT_CAPABILITIES.ui}

2. REGLAS DE CAPACIDAD (JSDoc Tags):
   - @ai-capability AUTH_HOOK: Usa 'hooks/useAuthLogic.ts' para cualquier lógica de login/logout/reset.
   - @ai-capability DATABASE_WRITE: SIEMPRE usa 'smartAddDoc' (services/firestore.ts) para escribir, nunca addDoc nativo.
   - @ai-capability AUTH_CORE: Usa 'services/firebase.ts' solo para primitivas de bajo nivel.

3. INSTRUCCIÓN DE TAREA:
`;

    const finalPrompt = `${contextBlock}${processedInput}\n\nGenera el código cumpliendo estrictamente estas referencias arquitectónicas.`;
    setOptimizedPrompt(finalPrompt);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(optimizedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToLibrary = async () => {
    if (!app || !optimizedPrompt) return;
    setIsSaving(true);
    
    // Golden Rule: Using smartAddDoc
    await smartAddDoc(app, 'saved_prompts', {
      title: userInput.substring(0, 50) + (userInput.length > 50 ? '...' : ''),
      content: optimizedPrompt,
      originalInput: userInput,
      variables: variables,
      createdAt: Date.now(),
      tags: ['prompt_manager']
    });

    setIsSaving(false);
    loadHistory(); // Refresh list
    alert("Prompt guardado en librería.");
  };

  const handleLoadHistoryItem = (item: any) => {
    setUserInput(item.originalInput || '');
    if (item.variables) setVariables(item.variables);
    setOptimizedPrompt(item.content || '');
  };

  const hasVariables = Object.keys(variables).length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-8 text-white shadow-xl border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/50">
            <Wand2 className="text-indigo-400" size={24} />
          </div>
          <h2 className="text-2xl font-bold">Prompt Architect</h2>
        </div>
        <p className="text-slate-400 max-w-2xl">
          Convierte requerimientos simples en instrucciones técnicas precisas que Google AI Studio entiende, forzando el uso de tu arquitectura existente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
        
        {/* LEFT COL: HISTORY */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
           <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <History size={18} className="text-slate-400" /> Librería
             </h3>
             <button onClick={loadHistory} className="text-slate-400 hover:text-indigo-600"><Clock size={16}/></button>
           </div>
           <div className="flex-1 overflow-y-auto p-2 space-y-2">
             {loadingHistory && <div className="p-4 text-center text-slate-400"><Loader2 className="animate-spin mx-auto"/></div>}
             {!loadingHistory && history.length === 0 && <div className="p-4 text-center text-xs text-slate-400">Sin prompts guardados.</div>}
             {history.map((item, idx) => (
               <button 
                key={item.id || idx}
                onClick={() => handleLoadHistoryItem(item)}
                className="w-full text-left p-3 rounded-lg border border-transparent hover:border-indigo-100 hover:bg-indigo-50 transition-all group"
               >
                 <div className="font-bold text-slate-700 text-sm truncate">{item.title}</div>
                 <div className="flex justify-between mt-1 text-xs text-slate-400">
                   <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                   <span className="group-hover:text-indigo-600">Cargar &rarr;</span>
                 </div>
               </button>
             ))}
           </div>
        </div>

        {/* RIGHT COL: WORKSPACE */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full overflow-hidden">
            {/* INPUT AREA */}
            <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Terminal size={18} className="text-slate-400" /> Tu Requerimiento
                </h3>
              </div>
              <div className="flex-1 p-4 flex flex-col min-h-0">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ej: Crea un formulario para {{entidad}} que requiera {{condicion}}..."
                  className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm leading-relaxed"
                />
                
                {/* Dynamic Variables Inputs */}
                {hasVariables && (
                   <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100 animate-in fade-in">
                      <h4 className="text-xs font-bold text-indigo-700 flex items-center gap-2 mb-2">
                        <Braces size={14} /> Variables Detectadas
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.keys(variables).map(vKey => (
                          <div key={vKey}>
                             <label className="text-[10px] font-bold text-indigo-500 uppercase">{vKey}</label>
                             <input 
                               type="text" 
                               value={variables[vKey]}
                               onChange={(e) => setVariables({...variables, [vKey]: e.target.value})}
                               className="w-full p-2 text-sm border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500"
                               placeholder={`Valor para ${vKey}`}
                             />
                          </div>
                        ))}
                      </div>
                   </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={generatePrompt}
                    disabled={!userInput.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg hover:shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition-all text-sm"
                  >
                    <Sparkles size={16} /> Traducir a Prompt Técnico
                  </button>
                </div>
              </div>
            </div>

            {/* OUTPUT AREA */}
            <div className="flex flex-col bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden relative flex-1 min-h-0">
              <div className="p-4 border-b border-slate-800 bg-black/20 flex items-center justify-between">
                <h3 className="font-bold text-indigo-400 flex items-center gap-2">
                  <FileText size={18} /> Prompt Optimizado
                </h3>
                <div className="flex gap-2">
                  {optimizedPrompt && app && (
                    <button
                      onClick={handleSaveToLibrary}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-all"
                    >
                       {isSaving ? <Loader2 className="animate-spin" size={14}/> : <Save size={14} />}
                       Guardar
                    </button>
                  )}
                  {optimizedPrompt && (
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        copied 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? '¡Copiado!' : 'Copiar'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 p-0 relative group min-h-0">
                <textarea
                  readOnly
                  value={optimizedPrompt}
                  className="w-full h-full p-6 bg-transparent text-slate-300 font-mono text-sm resize-none outline-none leading-relaxed custom-scrollbar selection:bg-indigo-500/30"
                  placeholder="El prompt generado aparecerá aquí..."
                />
                {!optimizedPrompt && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 pointer-events-none">
                    <ArrowRight size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">Esperando instrucciones...</p>
                  </div>
                )}
              </div>
            </div>
        </div>

      </div>
    </div>
  );
};
