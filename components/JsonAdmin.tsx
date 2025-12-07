
import React, { useState, useEffect } from 'react';
import { Settings2, Database, Globe, Save, RefreshCw, Eye, Code, Filter, Calculator, Plus, X, ArrowRight, Table, AlertCircle, Trash2, Box, BookOpen, Shield, Scroll, FileJson, Link as LinkIcon, SlidersHorizontal } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { smartAddDoc } from '../services/firestore';
import { fetchDocuments, deleteDocument, updateDocument } from '../services/firestoreAdmin';

// Tipos para la configuración
interface ComputedField {
  id: string;
  name: string;
  formula: string; // "price * 1.2" (Nombres de campos simples)
}

interface JsonComponentConfig {
  id?: string;
  title: string;
  category: string;
  url: string;
  visibleKeys: string[];
  computedFields: ComputedField[];
}

export const JsonAdmin: React.FC = () => {
  const { app } = useFirebase();
  const [components, setComponents] = useState<JsonComponentConfig[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  
  // Selección
  const [selectedConfig, setSelectedConfig] = useState<JsonComponentConfig | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // Estado del componente activo
  const [fetchedData, setFetchedData] = useState<any[]>([]);
  const [allKeys, setAllKeys] = useState<string[]>([]);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Edición
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editVisibleKeys, setEditVisibleKeys] = useState<string[]>([]);
  const [editComputed, setEditComputed] = useState<ComputedField[]>([]);

  // Filtros en Vista
  // key: columna seleccionada, value: valor filtrado
  const [activeFilter, setActiveFilter] = useState<{key: string, value: string} | null>(null);

  // Estado para Modal de Detalle
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    if (app) loadComponents();
  }, [app]);

  const loadComponents = async () => {
    if (!app) return;
    setLoadingList(true);
    const result = await fetchDocuments(app, 'json_components_config');
    if (result.success) {
      setComponents(result.data || []);
    }
    setLoadingList(false);
  };

  const handleCreateNew = () => {
    const newConfig: JsonComponentConfig = {
      title: 'Nuevo Componente',
      category: 'General',
      url: '',
      visibleKeys: [],
      computedFields: []
    };
    setSelectedConfig(null);
    loadConfigIntoEditor(newConfig);
    setMode('edit');
    setFetchedData([]);
  };

  const handleSelect = (config: JsonComponentConfig) => {
    setSelectedConfig(config);
    loadConfigIntoEditor(config);
    setMode('view');
    setSelectedItem(null); // Limpiar selección previa
    setActiveFilter(null); // Limpiar filtros previos
    fetchExternalJson(config.url);
  };

  const handleDeleteComponent = async (config: JsonComponentConfig) => {
    if (!app || !config.id) return;
    
    // BYPASS: No usamos confirm() por restricciones del entorno
    console.log(`[Delete] Solicitud para eliminar configuración: "${config.title}"`);

    setLoadingList(true);
    const result = await deleteDocument(app, 'json_components_config', config.id);
    
    if (result.success) {
      console.log("✅ Configuración eliminada correctamente.");
      // Si el que borramos es el que estaba seleccionado, limpiamos el editor
      if (selectedConfig?.id === config.id) {
        handleCreateNew();
      }
      await loadComponents(); // Recargar lista
    } else {
      console.error("❌ Error al eliminar:", result.error);
    }
    setLoadingList(false);
  };

  const loadConfigIntoEditor = (config: JsonComponentConfig) => {
    setEditTitle(config.title);
    setEditCategory(config.category);
    setEditUrl(config.url);
    setEditVisibleKeys(config.visibleKeys || []);
    setEditComputed(config.computedFields || []);
    setFetchError('');
  };

  const fetchExternalJson = async (url: string) => {
    if (!url) return;
    setLoadingFetch(true);
    setFetchError('');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      const arrayData = Array.isArray(data) ? data : (data.items || data.results || [data]);
      setFetchedData(arrayData);
      
      // Extract all keys from first object
      if (arrayData.length > 0) {
        setAllKeys(Object.keys(arrayData[0]));
      }
    } catch (e: any) {
      console.error(e);
      setFetchError("Error al cargar JSON. Verifica CORS y que la URL sea pública.");
      setFetchedData([]);
      setAllKeys([]);
    } finally {
      setLoadingFetch(false);
    }
  };

  const toggleKeyVisibility = (key: string) => {
    setEditVisibleKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const addComputedField = () => {
    const newField: ComputedField = {
      id: Date.now().toString(),
      name: 'Campo Nuevo',
      formula: ''
    };
    setEditComputed([...editComputed, newField]);
  };

  const updateComputedField = (id: string, field: string, value: string) => {
    setEditComputed(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const deleteComputedField = (id: string) => {
    setEditComputed(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = async () => {
    if (!app) return;
    
    const payload: JsonComponentConfig = {
      title: editTitle,
      category: editCategory,
      url: editUrl,
      visibleKeys: editVisibleKeys,
      computedFields: editComputed
    };

    console.log("[Save] Guardando configuración...");

    try {
      // Si existe un ID en la configuración seleccionada, es una ACTUALIZACIÓN
      if (selectedConfig && selectedConfig.id) {
         const result = await updateDocument(app, 'json_components_config', selectedConfig.id, payload);
         if (!result.success) throw new Error(result.error);
         console.log("✅ Configuración actualizada.");
         await loadComponents();
         setSelectedConfig({ ...payload, id: selectedConfig.id });
      } else {
         // Si no, es una CREACIÓN (Usamos smartAddDoc para registro automático)
         await smartAddDoc(app, 'json_components_config', payload);
         console.log("✅ Nueva configuración creada.");
         await loadComponents();
         setMode('view');
      }
      
    } catch (e: any) {
      console.error("❌ Error al guardar:", e.message || e);
    }
  };

  // --- LOGIC ENGINE ---
  const evaluateRow = (row: any, formula: string) => {
    try {
      let expr = formula;
      
      // 1. MEJORA DE SEGURIDAD Y LÓGICA: Ordenar claves por longitud descendente
      // Esto evita que 'precio' reemplace parte de 'precio_total'
      const sortedKeys = [...allKeys].sort((a, b) => b.length - a.length);

      sortedKeys.forEach(key => {
         // Verificamos si la clave existe en la fórmula antes de reemplazar para optimizar
         if (expr.includes(key)) {
             const rawVal = row[key];
             // Forzar numérico si es posible, o mantener string entre comillas si es texto
             const val = isNaN(Number(rawVal)) ? `"${rawVal}"` : rawVal;
             
             // Reemplazo global seguro
             expr = expr.split(key).join(String(val));
         }
      });

      // eslint-disable-next-line no-new-func
      return new Function(`return ${expr}`)();
    } catch (e) {
      return "Error Calc";
    }
  };

  // --- RENDER HELPERS ---
  
  // Agrupa los componentes por categoría
  const groupedComponents = components.reduce((acc, curr) => {
    const cat = curr.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {} as Record<string, JsonComponentConfig[]>);

  const renderSidebar = () => (
    <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
          <Settings2 size={14} /> Colección D&D
        </h3>
        <button 
          onClick={handleCreateNew}
          className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-lg text-sm font-medium transition-colors flex justify-center items-center gap-2 shadow-sm"
        >
          <Plus size={16} /> Nuevo Recurso
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {loadingList && <div className="text-center"><RefreshCw className="animate-spin text-slate-400 mx-auto" /></div>}
        
        {!loadingList && Object.entries(groupedComponents).map(([category, items]) => (
          <div key={category}>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-2">
              {category}
            </h4>
            <div className="space-y-1">
              {(items as JsonComponentConfig[]).map((comp) => {
                // Selección simple de icono basado en categoría (visual)
                let Icon = Database;
                const lowerCat = category.toLowerCase();
                if (lowerCat.includes('regla')) Icon = BookOpen;
                if (lowerCat.includes('inventario') || lowerCat.includes('equipo')) Icon = Box;
                if (lowerCat.includes('combate') || lowerCat.includes('arma')) Icon = Shield;
                if (lowerCat.includes('magia') || lowerCat.includes('conjuro')) Icon = Scroll;

                return (
                  <div
                    key={comp.id}
                    onClick={() => handleSelect(comp)}
                    className={`group relative w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer flex justify-between items-center ${
                      selectedConfig?.id === comp.id 
                        ? 'bg-white border border-indigo-200 shadow-sm text-indigo-700 font-medium' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                        <Icon size={16} className={selectedConfig?.id === comp.id ? "text-indigo-500" : "text-slate-400"} />
                        <span className="truncate">{comp.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {!loadingList && Object.keys(groupedComponents).length === 0 && (
          <div className="text-center text-slate-400 text-xs py-10">
            No hay componentes.<br/>Crea uno nuevo.
          </div>
        )}
      </div>
    </div>
  );

  const renderConfigPanel = () => (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* BASIC INFO */}
      <div className="grid grid-cols-2 gap-4">
        <div>
           <label className="text-xs font-bold text-slate-500 uppercase">Título</label>
           <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-2 border rounded mt-1" />
        </div>
        <div>
           <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
           <input type="text" value={editCategory} onChange={e => setEditCategory(e.target.value)} className="w-full p-2 border rounded mt-1" placeholder="Ej: REGLAS, INVENTARIO" />
        </div>
      </div>
      <div>
         <label className="text-xs font-bold text-slate-500 uppercase">URL del JSON (CORS Enabled)</label>
         <div className="flex gap-2 mt-1">
            <input type="text" value={editUrl} onChange={e => setEditUrl(e.target.value)} className="flex-1 p-2 border rounded font-mono text-sm" placeholder="https://..." />
            <button onClick={() => fetchExternalJson(editUrl)} className="px-3 bg-slate-100 border rounded hover:bg-slate-200"><RefreshCw size={16}/></button>
         </div>
      </div>

      {/* DETECTED KEYS */}
      {allKeys.length > 0 && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Eye size={16}/> Visibilidad de Columnas</h4>
          <div className="flex flex-wrap gap-2">
            {allKeys.map(key => (
              <button 
                key={key}
                onClick={() => toggleKeyVisibility(key)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  editVisibleKeys.includes(key) 
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 font-bold' 
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* COMPUTED FIELDS */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex justify-between items-center mb-3">
           <h4 className="font-bold text-slate-700 flex items-center gap-2"><Calculator size={16}/> Campos Calculados</h4>
           <button onClick={addComputedField} className="text-xs text-indigo-600 font-bold hover:underline">+ Agregar</button>
        </div>
        <div className="space-y-2">
          {editComputed.map((field) => (
            <div key={field.id} className="flex gap-2 items-center">
              <input 
                type="text" placeholder="Nombre" value={field.name}
                onChange={(e) => updateComputedField(field.id, 'name', e.target.value)}
                className="w-1/3 p-2 border rounded text-xs"
              />
              <ArrowRight size={14} className="text-slate-400" />
              <input 
                type="text" placeholder="Fórmula (ej: precio * 1.2)" value={field.formula}
                onChange={(e) => updateComputedField(field.id, 'formula', e.target.value)}
                className="flex-1 p-2 border rounded text-xs font-mono"
              />
              <button onClick={() => deleteComputedField(field.id)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
            </div>
          ))}
          {editComputed.length === 0 && <p className="text-xs text-slate-400 italic">Sin campos calculados.</p>}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <button onClick={handleSave} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md flex justify-center items-center gap-2">
          <Save size={18}/> Guardar Configuración
        </button>
      </div>
    </div>
  );

  const renderDetailModal = () => {
    if (!selectedItem) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileJson size={18} className="text-indigo-600"/> Inspección de Objeto
            </h3>
            <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {Object.entries(selectedItem).map(([key, val]) => (
              <div key={key} className="group">
                 <div className="flex items-baseline justify-between mb-1">
                   <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{key}</span>
                   <span className="text-[10px] text-slate-300 font-mono">{typeof val}</span>
                 </div>
                 {typeof val === 'object' && val !== null ? (
                   <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 overflow-x-auto">
                     <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>
                   </div>
                 ) : (
                   <div className="bg-white border-b border-slate-100 py-2 text-sm text-slate-800 font-medium break-words">
                     {String(val)}
                   </div>
                 )}
              </div>
            ))}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
             <button onClick={() => setSelectedItem(null)} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium text-sm transition-colors">
               Cerrar
             </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDataView = () => {
    if (loadingFetch) return <div className="flex justify-center p-12"><RefreshCw className="animate-spin text-slate-400" size={32}/></div>;
    if (fetchError) return <div className="p-8 text-center text-red-500 flex flex-col items-center gap-2"><AlertCircle size={32}/>{fetchError}</div>;
    if (fetchedData.length === 0) return <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2"><div className="p-3 bg-slate-100 rounded-full"><Database size={24}/></div><span>Sin datos. Carga una URL válida.</span></div>;

    // Filters Logic:
    // 1. Determine which key is selected for filtering (or default to empty if none)
    const currentFilterKey = activeFilter?.key || '';
    const currentFilterValue = activeFilter?.value || '';

    // 2. Compute unique values for the selected column
    const uniqueValues = currentFilterKey 
      ? Array.from(new Set(fetchedData.map(d => {
          const val = d[currentFilterKey];
          // Convert objects to string representation or ignore for dropdown cleanliness
          return typeof val === 'object' ? '[Object]' : String(val);
        }))).sort()
      : [];
    
    // 3. Apply Filter
    const filteredData = (currentFilterKey && currentFilterValue)
      ? fetchedData.filter(d => {
          const val = d[currentFilterKey];
          const strVal = typeof val === 'object' ? '[Object]' : String(val);
          return strVal === currentFilterValue;
        })
      : fetchedData;

    return (
      <div className="flex flex-col h-full bg-white">
        {/* Toolbar de Filtros */}
        <div className="px-6 py-3 border-b border-slate-100 flex flex-col md:flex-row items-center gap-4 bg-white shrink-0">
           
           <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
              <Filter size={16} />
              <span>Filtros:</span>
           </div>

           <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Selector de Columna */}
              <div className="relative">
                <select 
                  className="text-sm border border-slate-200 rounded-md pl-3 pr-8 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 min-w-[150px] text-slate-600 appearance-none cursor-pointer hover:border-indigo-300 transition-colors"
                  onChange={(e) => setActiveFilter(e.target.value ? { key: e.target.value, value: '' } : null)}
                  value={currentFilterKey}
                >
                  <option value="">-- Selecciona Columna --</option>
                  {editVisibleKeys.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              
              {/* Selector de Valor */}
              <div className="relative">
                <select 
                  className="text-sm border border-slate-200 rounded-md pl-3 pr-8 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 min-w-[150px] disabled:opacity-50 text-slate-600 appearance-none cursor-pointer hover:border-indigo-300 transition-colors"
                  onChange={(e) => setActiveFilter({ key: currentFilterKey, value: e.target.value })}
                  value={currentFilterValue}
                  disabled={!currentFilterKey}
                >
                  <option value="">-- Todos los valores --</option>
                  {uniqueValues.map((v: any) => (
                    <option key={String(v)} value={String(v)}>{String(v)}</option>
                  ))}
                </select>
              </div>

              {/* Botón Reset */}
              {currentFilterKey && (
                <button 
                  onClick={() => setActiveFilter(null)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Limpiar Filtros"
                >
                  <X size={14} />
                </button>
              )}
           </div>

           <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
             Mostrando {filteredData.length} de {fetchedData.length} registros
           </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="text-xs font-bold text-slate-400 uppercase bg-white border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {editVisibleKeys.map(key => <th key={key} className="px-6 py-4">{key}</th>)}
                {editComputed.map(field => <th key={field.id} className="px-6 py-4 text-indigo-600 bg-indigo-50/30">{field.name} (Calc)</th>)}
                <th className="px-6 py-4 text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {filteredData.map((row, i) => (
                 <tr key={i} className="hover:bg-slate-50 transition-colors">
                   {editVisibleKeys.map(key => {
                     const val = row[key];
                     const isComplex = typeof val === 'object' && val !== null;
                     
                     return (
                      <td key={key} className={`px-6 py-4 text-slate-700 align-top ${isComplex ? 'min-w-[300px]' : 'max-w-xs truncate'}`} title={!isComplex ? String(val) : ''}>
                        {isComplex ? (
                          <pre className="text-[10px] leading-tight bg-slate-50 p-2 rounded border border-slate-100 font-mono text-slate-600 overflow-auto max-h-40 w-full whitespace-pre-wrap">
                            {JSON.stringify(val, null, 2)}
                          </pre>
                        ) : (
                          String(val)
                        )}
                      </td>
                     );
                   })}
                   {editComputed.map(field => (
                     <td key={field.id} className="px-6 py-4 font-mono text-indigo-700 bg-indigo-50/10 align-top">
                       {evaluateRow(row, field.formula)}
                     </td>
                   ))}
                   <td className="px-6 py-4 text-right align-top">
                      <button 
                        onClick={() => setSelectedItem(row)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Ver Detalle Completo"
                      >
                        <Eye size={16} />
                      </button>
                   </td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (!app) return <div className="p-12 text-center text-slate-400">Firebase no inicializado.</div>;

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in relative">
      {renderDetailModal()}

      {renderSidebar()}
      
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Bar - Updated Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">

          <div className="flex items-center gap-4">
             {/* Icon Box */}
             <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
               <Database size={20} />
             </div>
             <div>
               <h2 className="text-lg font-bold text-slate-900 leading-tight">{editTitle || 'Editor JSON'}</h2>
               {editUrl ? (
                  <a href={editUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 flex items-center gap-1 hover:text-indigo-600 transition-colors mt-0.5 max-w-md truncate block">
                    <Globe size={10}/> {editUrl}
                  </a>
               ) : (
                 <span className="text-xs text-slate-400 block mt-0.5">Sin fuente de datos externa</span>
               )}
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedConfig?.id && (
                <button 
                  onClick={() => handleDeleteComponent(selectedConfig)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar esta configuración"
                >
                  <Trash2 size={18} />
                </button>
            )}

            {/* Segmented Control - Styled like toggle */}
            <div className="flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setMode('view')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    mode === 'view' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <Table size={14} /> Vista de Datos
                </button>
                <button 
                  onClick={() => setMode('edit')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    mode === 'edit' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <SlidersHorizontal size={14} /> Configuración
                </button