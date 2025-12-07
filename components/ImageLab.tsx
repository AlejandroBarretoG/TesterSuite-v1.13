
import React, { useState } from 'react';
import { Image as ImageIcon, Wand2, Download, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { runGeminiTests } from '../services/gemini';

// Modelos disponibles para imagen
// Eliminamos modelos experimentales de chat (Flash 2.0) que causan errores de texto
const IMAGE_MODELS = [
  { id: 'imagen-3.0-generate-001', name: 'Imagen 3 (Alta Calidad)' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image (Multimodal)' },
];

export const ImageLab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0].id); // Estado para el modelo
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!apiKey) {
      setError("Falta API Key de Gemini.");
      return;
    }

    setLoading(true);
    setError(null);
    setResultImage(null);

    // Pasamos el modelo seleccionado a la función
    const res = await runGeminiTests.generateImage(apiKey, prompt, selectedModel);
    
    if (res.success && res.data?.url) {
      setResultImage(res.data.url);
    } else {
      setError(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <ImageIcon size={28} />
          </div>
          <h2 className="text-2xl font-bold">Image Lab</h2>
        </div>
        <p className="text-pink-100 max-w-2xl">
          Generación real utilizando modelos Imagen y Gemini de Google Cloud.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Input Panel */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            
            {/* SELECTOR DE MODELO */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2 flex items-center gap-2">
                <Layers size={14}/> Modelo de Generación
              </label>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
              >
                {IMAGE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Prompt de Imagen</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 text-sm h-32 resize-none"
                placeholder="Ej: Un paisaje futurista cyberpunk con luces de neón azules y púrpuras..."
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold shadow-lg shadow-pink-200 disabled:opacity-50 disabled:shadow-none transition-all"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
                Generar Real
              </button>
            </div>
            
            {/* Error Display */}
            {error && (
               <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center gap-2 break-all">
                 <AlertCircle size={16} className="shrink-0"/> <span>{error}</span>
               </div>
            )}
          </div>
        </div>

        {/* Output Panel (Igual que antes pero ahora mostrará la imagen real) */}
        <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg flex flex-col items-center justify-center min-h-[300px] border border-slate-800 relative group">
           {resultImage ? (
             <>
               <img src={resultImage} alt="Generada" className="w-full h-full object-contain" />
               <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <a 
                   href={resultImage} 
                   download={`imagen_ai_${Date.now()}.png`}
                   className="p-3 bg-white/90 text-slate-900 rounded-full shadow-lg hover:bg-white flex items-center gap-2 font-bold text-xs"
                 >
                   <Download size={16} /> Descargar
                 </a>
               </div>
             </>
           ) : (
             <div className="text-slate-500 text-center">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw size={32} className="animate-spin text-pink-500" />
                    <p className="text-sm text-slate-400">Consultando a Google Cloud...</p>
                  </div>
                ) : (
                  <>
                    <ImageIcon size={48} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">El lienzo está vacío.</p>
                  </>
                )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
