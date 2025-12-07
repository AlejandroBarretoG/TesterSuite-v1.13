
import React, { useState, useEffect, useCallback } from 'react';
import { UploadCloud, File, Trash2, Link as LinkIcon, Image as ImageIcon, Loader2, Check, RefreshCw, Folder, Grid, List, LayoutList, FolderPlus, ArrowUp, Move, ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { uploadFile, listFiles, deleteFile, createFolder, moveFile, deleteFolder, FileData } from '../services/storage';

type ViewMode = 'grid' | 'large' | 'list' | 'detail';

// Subcomponente TreeView para navegación y movimiento
const FolderTree = ({ 
  currentPath, 
  onSelect, 
  app 
}: { currentPath: string, onSelect: (path: string) => void, app: any }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({'public_assets/': true});
  const [treeData, setTreeData] = useState<Record<string, string[]>>({}); // Path -> Subfolders

  const toggleNode = async (path: string) => {
    const isExpanded = !!expanded[path];
    setExpanded(prev => ({ ...prev, [path]: !isExpanded }));
    
    if (!isExpanded && !treeData[path]) {
      // Lazy load subfolders
      const res = await listFiles(app, path);
      if (res.success && res.files) {
        const subfolders = res.files.filter(f => f.type === 'folder').map(f => f.fullPath);
        setTreeData(prev => ({ ...prev, [path]: subfolders }));
      }
    }
  };

  // Render recursivo simple (solo un nivel de profundidad por click para no complicar el state)
  const renderNode = (path: string, level: number = 0) => {
    const name = path.split('/').filter(Boolean).pop() || 'Root';
    const isExp = expanded[path];
    const subfolders = treeData[path] || [];
    const isCurrent = currentPath === path;

    return (
      <div key={path} className="select-none">
        <div 
          className={`flex items-center gap-1 py-1 px-2 hover:bg-slate-100 cursor-pointer rounded ${isCurrent ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600'}`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => onSelect(path)}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); toggleNode(path); }}
            className="p-0.5 hover:bg-slate-200 rounded text-slate-400"
          >
            {isExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          <Folder size={14} className={isCurrent ? "text-blue-500" : "text-slate-400"} />
          <span className="text-xs truncate">{name}</span>
        </div>
        {isExp && subfolders.map(sub => renderNode(sub, level + 1))}
      </div>
    );
  };

  // Start with root
  return <div className="py-2">{renderNode('public_assets/')}</div>;
};

export const StorageLab: React.FC = () => {
  const { app } = useFirebase();
  const [files, setFiles] = useState<FileData[]>([]);
  const [currentPath, setCurrentPath] = useState('public_assets/');
  
  // UI States
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false); // External drag
  const [isInternalDragging, setIsInternalDragging] = useState(false); // Moving files
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTreeNav, setShowTreeNav] = useState(false);
  
  // Modal States
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moveTarget, setMoveTarget] = useState<FileData | null>(null);
  const [moveDestInput, setMoveDestInput] = useState('');

  useEffect(() => {
    if (app) loadFiles(currentPath);
  }, [app, currentPath]);

  const loadFiles = async (path: string) => {
    if (!app) return;
    setIsLoading(true);
    const result = await listFiles(app, path);
    if (result.success && result.files) {
      setFiles(result.files);
    }
    setIsLoading(false);
  };

  const navigateUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length <= 1) return;
    parts.pop();
    setCurrentPath(parts.join('/') + '/');
  };

  const handleFolderClick = (folderName: string) => {
    setCurrentPath(prev => `${prev}${folderName}/`);
  };

  const handleCreateFolder = async () => {
    if (!app || !newFolderName.trim()) return;
    setIsLoading(true);
    await createFolder(app, currentPath, newFolderName.trim());
    setNewFolderName('');
    setShowNewFolder(false);
    loadFiles(currentPath);
  };

  const handleMoveFile = async () => {
    if (!app || !moveTarget || !moveDestInput) return;
    setIsLoading(true);
    const destPath = moveDestInput.endsWith('/') ? moveDestInput : moveDestInput + '/';
    const fullNewPath = destPath + moveTarget.name;

    const result = await moveFile(app, moveTarget.fullPath, fullNewPath);
    if (result.success) {
      setMoveTarget(null);
      setMoveDestInput('');
      loadFiles(currentPath);
    } else {
      alert("Error moviendo archivo: " + result.error);
      setIsLoading(false);
    }
  };

  // --- External Drag & Drop (Upload) ---
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); if(!isInternalDragging) setIsDragging(true); }, [isInternalDragging]);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (!app || isInternalDragging) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    await processUpload(droppedFiles[0]);
  }, [app, currentPath, isInternalDragging]);

  // --- Internal Drag & Drop (Move to Folder) ---
  const handleInternalDragStart = (e: React.DragEvent, file: FileData) => {
    e.dataTransfer.setData("file_data", JSON.stringify(file));
    e.dataTransfer.effectAllowed = "move";
    setIsInternalDragging(true);
  };

  const handleInternalDropOnFolder = async (e: React.DragEvent, folderName: string) => {
    e.preventDefault();
    e.stopPropagation(); // Stop bubbling to upload drop zone
    setIsInternalDragging(false);
    
    try {
      const data = e.dataTransfer.getData("file_data");
      if (!data) return;
      const sourceFile = JSON.parse(data) as FileData;
      
      if (sourceFile.name === folderName) return; // Can't move into self (logic check)

      const confirmMove = confirm(`¿Mover "${sourceFile.name}" a "${folderName}"?`);
      if (!confirmMove || !app) return;

      setIsLoading(true);
      const destPath = `${currentPath}${folderName}/${sourceFile.name}`;
      await moveFile(app, sourceFile.fullPath, destPath);
      loadFiles(currentPath);

    } catch (err) {
      console.error(err);
    }
  };

  const processUpload = async (file: File) => {
    if (!app) return;
    setUploadProgress(1);
    const result = await uploadFile(app, file, currentPath, (p) => setUploadProgress(p));
    if (result.success) {
      setUploadProgress(0);
      loadFiles(currentPath);
    } else {
      setUploadProgress(0);
      alert("Error: " + result.error);
    }
  };

  const handleDelete = async (fullPath: string, isFolder: boolean) => {
    if (!app) return;
    
    // NOTA: Bypass de confirm() para entorno sandboxed
    console.log(`[Action] Solicitud de borrado para: ${fullPath} (Carpeta: ${isFolder})`);
    
    setIsLoading(true);
    let result: any;
    
    if (isFolder) {
      result = await deleteFolder(app, fullPath);
    } else {
      result = await deleteFile(app, fullPath);
    }
    
    setIsLoading(false);

    if (result.success) {
      // Diagnóstico de "éxito fantasma"
      if (isFolder && result.count === 0) {
         console.warn(`⚠️ ALERTA: La operación reportó éxito pero se borraron 0 archivos. Es probable que la ruta "${fullPath}" no coincida.`);
      } else {
         console.log("✅ Borrado exitoso.");
      }
      loadFiles(currentPath);
    } else {
      // Usamos console.error en lugar de alert para ver el fallo
      console.error(`❌ ERROR CRÍTICO AL BORRAR:\n${result.error}`);
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined || bytes === 0) return '--';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!app) return <div className="p-8 text-center text-slate-400">Conecta Firebase primero.</div>;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 relative">
      {/* 1. HEADER (Blue) */}
      <div className="bg-blue-600 p-6 rounded-xl text-white shadow-lg flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UploadCloud size={28} /> Storage Lab
          </h2>
          <div className="relative mt-2">
             <div className="flex items-center gap-2 text-blue-100 text-sm font-mono bg-blue-700/50 px-3 py-1.5 rounded-lg border border-blue-500/50">
                <span className="opacity-60 select-none">Ruta:</span> 
                <span className="truncate max-w-[200px]" title={currentPath}>/{currentPath}</span>
                <button onClick={() => setShowTreeNav(!showTreeNav)} className="hover:bg-blue-600 rounded p-0.5 ml-1 transition-colors">
                  <ChevronDown size={14} className={`transform transition-transform ${showTreeNav ? 'rotate-180' : ''}`} />
                </button>
             </div>
             {/* TreeView Dropdown */}
             {showTreeNav && (
               <div className="absolute top-full left-0 mt-2 w-64 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-20 text-slate-800 p-2">
                 <FolderTree currentPath={currentPath} onSelect={(p) => { setCurrentPath(p); setShowTreeNav(false); }} app={app} />
               </div>
             )}
          </div>
        </div>
      </div>

      {/* 2. DROP ZONE (Moved Here per Request) */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
          isDragging ? 'border-blue-500 bg-blue-50 h-32 scale-[1.01]' : 'border-slate-200 bg-slate-50/50 h-24 hover:border-blue-300'
        } flex flex-col items-center justify-center text-center`}
      >
        <input type="file" onChange={(e) => e.target.files?.[0] && processUpload(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        {uploadProgress > 0 ? (
          <div className="w-full max-w-xs px-4">
             <div className="flex justify-between text-xs text-blue-600 mb-1 font-bold"><span>Subiendo...</span><span>{Math.round(uploadProgress)}%</span></div>
             <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${uploadProgress}%` }} /></div>
          </div>
        ) : (
          <div className="pointer-events-none text-slate-400">
            <UploadCloud className={`mx-auto mb-1 ${isDragging ? 'text-blue-500' : ''}`} size={24} />
            <p className="text-xs font-medium">{isDragging ? '¡Suelta para subir!' : 'Arrastra archivos aquí para subir a esta carpeta'}</p>
          </div>
        )}
      </div>

      {/* 3. TOOLBAR */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-3 justify-between items-center">
        <div className="flex items-center gap-2">
           <button onClick={navigateUp} disabled={currentPath === 'public_assets/'} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Subir Nivel"><ArrowUp size={18} /></button>
           <button onClick={() => loadFiles(currentPath)} className={`p-2 hover:bg-slate-100 rounded-lg text-slate-600 ${isLoading ? 'animate-spin' : ''}`} title="Recargar"><RefreshCw size={18} /></button>
           <div className="h-6 w-px bg-slate-200 mx-1" />
           <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"><FolderPlus size={16} /> Nueva Carpeta</button>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
           {[
             { id: 'grid', icon: Grid, label: 'Grid' }, 
             { id: 'large', icon: LayoutGrid, label: 'Grande' },
             { id: 'list', icon: List, label: 'Lista' }, 
             { id: 'detail', icon: LayoutList, label: 'Detalle' }
           ].map((mode) => (
             <button key={mode.id} onClick={() => setViewMode(mode.id as ViewMode)} className={`p-1.5 rounded-md transition-all ${viewMode === mode.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title={mode.label}>
               <mode.icon size={16} />
             </button>
           ))}
        </div>
      </div>

      {/* NEW FOLDER INPUT */}
      {showNewFolder && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3 animate-in fade-in">
           <FolderPlus size={20} className="text-blue-500" />
           <input autoFocus type="text" placeholder="Nombre de carpeta..." value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="flex-1 p-2 border border-blue-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-400" onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}/>
           <button onClick={handleCreateFolder} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold hover:bg-blue-700">Crear</button>
           <button onClick={() => setShowNewFolder(false)} className="p-2 text-slate-400 hover:text-slate-600"><Trash2 size={16}/></button>
        </div>
      )}

      {/* MOVE FILE MODAL (With TreeView) */}
      {moveTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md flex flex-col max-h-[80vh]">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Move size={20} /> Mover Archivo</h3>
            <p className="text-sm text-slate-600 mb-2">Moviendo: <strong>{moveTarget.name}</strong></p>
            
            <div className="flex-1 border border-slate-200 rounded-lg overflow-y-auto mb-4 p-2 bg-slate-50">
               <p className="text-xs font-bold text-slate-400 uppercase mb-2 px-2">Selecciona destino:</p>
               {/* Reusing FolderTree for destination picking */}
               <FolderTree currentPath={moveDestInput || currentPath} onSelect={(p) => setMoveDestInput(p)} app={app} />
            </div>
            
            <div className="text-xs text-slate-500 mb-4 truncate bg-slate-100 p-2 rounded">
               Destino: <span className="font-mono text-slate-700">{moveDestInput || "Selecciona una carpeta..."}</span>
            </div>

            <div className="flex justify-end gap-2 shrink-0">
              <button onClick={() => setMoveTarget(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
              <button onClick={handleMoveFile} disabled={!moveDestInput} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">Mover</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FILES LIST */}
      {files.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">Carpeta vacía</div>
      ) : (
        <div className={`
          ${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4' : ''}
          ${viewMode === 'large' ? 'grid grid-cols-1 md:grid-cols-3 gap-6' : ''} 
          ${viewMode === 'list' ? 'flex flex-col gap-2' : ''}
          ${viewMode === 'detail' ? 'flex flex-col border border-slate-200 rounded-xl overflow-hidden' : ''}
        `}>
          {viewMode === 'detail' && (
             <div className="grid grid-cols-12 gap-4 bg-slate-50 p-3 text-xs font-bold text-slate-500 border-b border-slate-200">
               <div className="col-span-6">Nombre</div>
               <div className="col-span-2">Tipo</div>
               <div className="col-span-2">Tamaño</div>
               <div className="col-span-2 text-right">Acciones</div>
             </div>
          )}

          {files.map((file) => {
            const isFolder = file.type === 'folder';
            
            // --- RENDER: GRID & LARGE VIEWS ---
            if (viewMode === 'grid' || viewMode === 'large') {
              return (
                <div 
                  key={file.fullPath}
                  draggable={!isFolder}
                  onDragStart={(e) => handleInternalDragStart(e, file)}
                  onDragOver={(e) => { if(isFolder) { e.preventDefault(); e.currentTarget.classList.add('bg-blue-100'); } }}
                  onDragLeave={(e) => { if(isFolder) e.currentTarget.classList.remove('bg-blue-100'); }}
                  onDrop={(e) => { if(isFolder) { e.currentTarget.classList.remove('bg-blue-100'); handleInternalDropOnFolder(e, file.name); } }}
                  
                  className={`group relative bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-all flex flex-col items-center text-center cursor-pointer 
                    ${isFolder ? 'hover:border-blue-300' : ''}
                    ${viewMode === 'large' ? 'aspect-square justify-center p-8' : ''}
                  `}
                  onClick={() => isFolder && handleFolderClick(file.name)}
                >
                  <div className={`mb-3 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform ${viewMode === 'large' ? 'w-24 h-24' : 'w-12 h-12'}`}>
                    {isFolder ? <Folder size={viewMode === 'large' ? 80 : 40} className="text-blue-400 fill-blue-50" /> : 
                     file.contentType?.startsWith('image/') ? <img src={file.url} alt="" className="w-full h-full object-cover rounded-lg shadow-sm" /> : 
                     <File size={viewMode === 'large' ? 64 : 32} />}
                  </div>
                  <div className="w-full">
                    <h4 className={`font-medium text-slate-700 truncate w-full ${viewMode === 'large' ? 'text-base' : 'text-xs'}`} title={file.name}>{file.name}</h4>
                    {!isFolder && <p className="text-[10px] text-slate-400 mt-0.5">{formatSize(file.size)}</p>}
                  </div>
                  
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionButtons file={file} onDelete={() => handleDelete(file.fullPath, isFolder)} onCopy={(url: string) => handleCopyUrl(url, file.fullPath)} copiedId={copiedId} onMove={() => { setMoveTarget(file); setMoveDestInput(currentPath); }} />
                  </div>
                </div>
              );
            }

            // --- RENDER: LIST & DETAIL VIEWS ---
            return (
              <div 
                key={file.fullPath} 
                draggable={!isFolder}
                onDragStart={(e) => handleInternalDragStart(e, file)}
                onDragOver={(e) => { if(isFolder) e.preventDefault(); }}
                onDrop={(e) => { if(isFolder) handleInternalDropOnFolder(e, file.name); }}
                className={`${viewMode === 'list' 
                   ? 'group flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer' 
                   : 'grid grid-cols-12 gap-4 p-3 border-b border-slate-50 hover:bg-slate-50 items-center text-sm cursor-pointer group'
                }`}
                onClick={() => isFolder && handleFolderClick(file.name)}
              >
                {viewMode === 'list' ? (
                   <>
                    <div className="w-8 h-8 flex items-center justify-center text-slate-400 shrink-0">
                      {isFolder ? <Folder size={20} className="text-blue-400" /> : <File size={20} />}
                    </div>
                    <span className="text-sm font-medium text-slate-700 flex-1 truncate">{file.name}</span>
                    {!isFolder && <span className="text-xs text-slate-400 w-20 text-right">{formatSize(file.size)}</span>}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionButtons file={file} onDelete={() => handleDelete(file.fullPath, isFolder)} onCopy={(url: string) => handleCopyUrl(url, file.fullPath)} copiedId={copiedId} onMove={() => { setMoveTarget(file); setMoveDestInput(currentPath); }} />
                    </div>
                   </>
                ) : (
                   /* Detail Mode */
                   <>
                    <div className="col-span-6 flex items-center gap-3 font-medium text-slate-700 truncate">
                       {isFolder ? <Folder size={16} className="text-blue-400" /> : <File size={16} className="text-slate-400" />}
                       {file.name}
                    </div>
                    <div className="col-span-2 text-xs text-slate-500 truncate">{isFolder ? 'Carpeta' : file.contentType || 'Archivo'}</div>
                    <div className="col-span-2 text-xs font-mono text-slate-400">{formatSize(file.size)}</div>
                    <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                        <ActionButtons file={file} onDelete={() => handleDelete(file.fullPath, isFolder)} onCopy={(url: string) => handleCopyUrl(url, file.fullPath)} copiedId={copiedId} onMove={() => { setMoveTarget(file); setMoveDestInput(currentPath); }} />
                    </div>
                   </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ActionButtons = ({ file, onDelete, onCopy, copiedId, onMove }: any) => {
  const isFolder = file.type === 'folder';
  
  return (
    <>
      {!isFolder && (
        <>
          <button onClick={(e) => { e.stopPropagation(); onCopy(file.url); }} className="p-1.5 bg-white border border-slate-200 rounded hover:text-green-600 hover:border-green-200 shadow-sm" title="Copiar URL">
            {copiedId === file.fullPath ? <Check size={14} /> : <LinkIcon size={14} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMove(); }} className="p-1.5 bg-white border border-slate-200 rounded hover:text-blue-600 hover:border-blue-200 shadow-sm" title="Mover">
            <Move size={14} />
          </button>
        </>
      )}
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 bg-white border border-slate-200 rounded hover:text-red-600 hover:border-red-200 shadow-sm" title={isFolder ? "Eliminar Carpeta (Recursivo)" : "Eliminar"}>
        <Trash2 size={14} />
      </button>
    </>
  );
};
