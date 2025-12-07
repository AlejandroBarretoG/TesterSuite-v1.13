
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Aperture, RefreshCw, Zap, Image as ImageIcon, AlertCircle, Coins, Eye, EyeOff, Activity, BatteryCharging, Pause, Play, History, FileText, FastForward, Hourglass, Repeat, Layers, ChevronRight, BrainCircuit, Microscope, Lightbulb, Search, Sparkles, BookOpen, Quote } from 'lucide-react';
import { runGeminiTests } from '../services/gemini';

// CONFIGURACIÓN DEL SISTEMA DE AHORRO
const ECO_CONFIG = {
  CHECK_INTERVAL_MS: 1000,      // Revisar cambios cada segundo
  MOTION_THRESHOLD: 10,         // % de píxeles diferentes para considerar "movimiento"
  INACTIVITY_TIMEOUT_MS: 10000, // 10 segundos sin movimiento = Modo Sueño (Ahorro)
};

const NARRATIVE_PROMPT = `
ACT AS: "Analista de Patrones Conductuales" y "Filósofo de lo Cotidiano".

CONTEXTO:
Los humanos operan en bucles (loops). Tu objetivo no es solo etiquetar la acción, sino encontrar el "ELEMENTO DE INTERÉS" dentro de la repetición.
¿Qué define a este bucle? ¿Es ansiedad? ¿Es maestría? ¿Es aburrimiento?

REGLAS DE LÓGICA:

1. ESTADO "BUFFERING" (Loop Detectado):
   - Si la acción persiste, el estado es "Stagnant".
   - CONSISTENCIA: Mantén la etiqueta de la acción principal igual.

2. PROFUNDIZACIÓN (El Insight):
   - En el campo 'repetition_interest', responde a: "¿Qué cualidad oculta tiene esta repetición?".
   - Ejemplos: "Micro-ajustes nerviosos", "Ritmo hipnótico", "Duda sistemática", "Precisión mecánica".

3. ESTADO "AVANCE" (Ruptura):
   - Solo si cambia el contexto macro (ej: de cocinar a comer), el estado es "Advancing".

4. FORMATO JSON (Strict):
   {
     "is_new_concept": boolean, 
     "current_action": string, // Etiqueta corta (ej: "Tecleando")
     "narrative_output": stringOrNull, // Resumen si hay avance
     "progress_check": "Stagnant" | "Advancing",
     "repetition_interest": stringOrNull // EL CONCEPTO PROFUNDO (ej: "Frenesí productivo")
   }
`;

const STORY_PROMPT = `
ACT AS: "Showrunner de Documental".
OBJETIVO: Generar una SINOPSIS del momento actual basada en el historial de micro-acciones y la imagen presente.

INPUT HISTÓRICO PROVISTO EN EL PROMPT:
Analiza la lista de acciones repetitivas previas.

TAREA:
Responde a la pregunta: "¿Qué está construyendo o intentando lograr el sujeto a gran escala?"
No describas la imagen estática. Describe el "Arco Narrativo" de los últimos minutos.

FORMATO JSON (Strict):
{
  "current_concept": string, // Título del capítulo actual (ej: "La Búsqueda de Inspiración")
  "synopsis": string, // Resumen de 2 oraciones integrando el pasado inmediato y el presente.
  "mood": string // Clima emocional (ej: "Frustración", "Calma Zen")
}
`;

const FORENSIC_PROMPT = `
ACT AS: "Psicólogo Forense de Datos" y "Teórico de Autómatas".
INPUT: Estadísticas de movimiento crudo (sin imagen) registradas durante un periodo ciego (Cámara Pausada).

TU TAREA:
Inferir el estado psicológico o mecánico del sujeto basándote SOLAMENTE en la densidad y ritmo del movimiento.

PERFILES TEÓRICOS:
- Alta Densidad (>80%): "Manic Loop" (Ansiedad, Productividad Frenética o Caos mecánico).
- Media Densidad (40-70%): "Steady Flow" (Concentración, Rutina doméstica, Ritmo Circadiano estable).
- Baja Densidad (<30%): "Ghosting" (Duda, Lectura pasiva, Presencia intermitente).
- Ráfagas (Bursts): "Intermittent Reinforcement" (Distracción, Revisión de celular, Tic nervioso).

SALIDA JSON (Strict):
{
  "psychological_concept": string, // Ej: "Ansiedad Latente", "Flujo Profundo", "Estasis"
  "automata_pattern": string, // Ej: "Oscilador Armónico", "Ruido Blanco", "Impulso Unitario"
  "theory": string // Breve teoría (max 15 palabras) de lo que pasó en la oscuridad.
}
`;

interface VisionLog {
  id: string;
  time: string;
  type: 'user' | 'system' | 'ai' | 'error' | 'forensic';
  message: string;
  tokens?: number;
}

interface BehaviorCycle {
  id: string;
  action: string;
  count: number;
  startTime: string;
  intensity: 'low' | 'medium' | 'high';
  insight?: string; // Profundización del concepto
}

interface StoryContext {
  title: string;
  synopsis: string;
  mood: string;
  timestamp: string;
}

// Utility for cleaning model responses that might contain markdown blocks
const cleanAndParseJson = (text: string | undefined): any => {
  if (!text) throw new Error("Recibida respuesta vacía de la IA.");
  
  // Remove markdown code blocks if present (e.g. ```json ... ```)
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON:", cleaned);
    throw new Error("Formato JSON inválido en respuesta.");
  }
};

export const LiveVision: React.FC = () => {
  // Referencias DOM
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const cycleListRef = useRef<HTMLDivElement>(null);
  
  // Estado de Hardware
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado de Control Manual
  const [isPaused, setIsPaused] = useState(false); // PAUSA MANUAL DEL USUARIO

  // Estado de IA y Lógica
  const [analyzing, setAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [narrativeState, setNarrativeState] = useState<'Stagnant' | 'Advancing'>('Stagnant');
  
  // Estado de Ciclos
  const [activeCycle, setActiveCycle] = useState<BehaviorCycle | null>(null);
  const [detectedCycles, setDetectedCycles] = useState<BehaviorCycle[]>([]);
  
  // Estado de Historia (Sinopsis)
  const [storyContext, setStoryContext] = useState<StoryContext | null>(null);

  // Estado de Recursos (Tokens & Logs)
  const [tokenStats, setTokenStats] = useState({ prompt: 0, response: 0, total: 0 });
  const [logs, setLogs] = useState<VisionLog[]>([]);
  const [systemState, setSystemState] = useState<'idle' | 'monitoring' | 'sleeping'>('idle');
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);

  // --- NUEVO: BUFFER DE PAUSA (Metadata Recorder) ---
  const [pauseBufferCount, setPauseBufferCount] = useState(0); // Para UI
  const pauseBufferRef = useRef<number[]>([]); // Almacena timestamps reales
  const pauseStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key');
    if (key) setApiKey(key);
    addLog('system', 'Sistema listo. Esperando activación de cámara.');
    return () => stopCamera();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Auto-scroll cycles
  useEffect(() => {
    cycleListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [detectedCycles]);

  // --- SISTEMA DE LOGS (ECONÓMICO / LOCAL) ---
  const addLog = (type: VisionLog['type'], message: string, tokens?: number) => {
    const newLog: VisionLog = {
      id: Date.now().toString() + Math.random().toString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      message,
      tokens
    };
    // Mantenemos solo los últimos 50 eventos para no saturar memoria
    setLogs(prev => [...prev.slice(-49), newLog]);
  };

  // --- MOTOR DE DETECCIÓN DE MOVIMIENTO (GRATIS) ---
  const checkMotion = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return 0;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Usamos una resolución baja para comparar rápido (ahorro de CPU)
    const w = 64; 
    const h = 48; 
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;

    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const currentData = imageData.data;

    if (!previousFrameRef.current) {
      previousFrameRef.current = currentData;
      return 100; // Primer frame siempre es "cambio"
    }

    // Comparación simple de píxeles
    let diffScore = 0;
    const totalPixels = w * h;
    
    // Muestreo cada 4 píxeles para velocidad
    for (let i = 0; i < currentData.length; i += 4 * 4) {
      const rDiff = Math.abs(currentData[i] - previousFrameRef.current[i]);
      const gDiff = Math.abs(currentData[i+1] - previousFrameRef.current[i+1]);
      const bDiff = Math.abs(currentData[i+2] - previousFrameRef.current[i+2]);
      
      if (rDiff + gDiff + bDiff > 100) { // Umbral de diferencia de color
        diffScore++;
      }
    }

    previousFrameRef.current = currentData;
    // Retornar porcentaje de cambio
    return (diffScore / (totalPixels / 4)) * 100; 
  }, []);

  // --- BUCLE PRINCIPAL DE VISIÓN ---
  useEffect(() => {
    if (!isCameraActive || systemState === 'idle') return;

    const interval = setInterval(() => {
      
      if (analyzing) return; // No saturar si ya está pensando

      const motionPercent = checkMotion();
      const now = Date.now();
      const timeSinceActivity = now - lastActivityTime;

      // LÓGICA DE ESTADOS
      if (motionPercent > ECO_CONFIG.MOTION_THRESHOLD) {
        // ¡Hay movimiento!
        setLastActivityTime(now);
        
        if (systemState === 'sleeping') {
          setSystemState('monitoring'); // Despertar
          addLog('system', '👀 Movimiento detectado. Despertando sensor.');
        } else {
          // Si estamos activos y hay cambios grandes
          if (isPaused) {
             // MODO PAUSA: Acumular metadatos
             pauseBufferRef.current.push(now);
             setPauseBufferCount(prev => prev + 1);
             // Solo loguear visualmente cada 5 segundos para no spammear
             if (pauseBufferRef.current.length % 5 === 0) {
                addLog('system', `💾 Recolectando metadatos... (${pauseBufferRef.current.length} eventos)`);
             }
          } else {
             // MODO ACTIVO: Decidir si enviar a IA
             if (Math.random() > 0.7) { 
               captureAndAnalyze(); 
             }
          }
        }
      } else {
        // Está quieto
        if (timeSinceActivity > ECO_CONFIG.INACTIVITY_TIMEOUT_MS && systemState !== 'sleeping') {
          setSystemState('sleeping');
          addLog('system', '💤 Sin actividad. Entrando en Modo Sueño (Ahorro Máximo).');
        }
      }

    }, ECO_CONFIG.CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isCameraActive, systemState, lastActivityTime, analyzing, checkMotion, isPaused]);

  // --- CONTROL DE CÁMARA Y PAUSA ---
  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
      setIsCameraActive(true);
      setSystemState('monitoring');
      setIsPaused(false);
      setLastActivityTime(Date.now());
      setActiveCycle(null);
      setDetectedCycles([]);
      setStoryContext(null);
      
      // Reset Buffer
      pauseBufferRef.current = [];
      setPauseBufferCount(0);
      pauseStartTimeRef.current = null;

      addLog('user', '🟢 Cámara iniciada. Monitoreo activo.');
    } catch (err: any) {
      setErrorMsg("Error de cámara: " + err.message);
      addLog('error', `Fallo de cámara: ${err.message}`);
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setIsCameraActive(false);
    setSystemState('idle');
    addLog('user', '🔴 Cámara detenida. Sesión finalizada.');
  };

  const togglePause = () => {
    if (!isCameraActive) return;
    const newState = !isPaused;
    setIsPaused(newState);
    if (newState) {
      // INICIA LA RECOLECCIÓN
      pauseStartTimeRef.current = Date.now();
      pauseBufferRef.current = [];
      setPauseBufferCount(0);
      addLog('user', '⏸️ Usuario pausó IA. Iniciando recolección fantasma.');
    } else {
      // TERMINA RECOLECCIÓN
      addLog('user', '▶️ Usuario reanudó IA.');
      setLastActivityTime(Date.now());
    }
  };

  // --- CAPTURA BÁSICA ---
  const getSnapshot = () => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement('canvas'); 
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  };

  // --- STORY CHECK-IN (¿Qué tenemos hasta ahora?) ---
  const generateStorySummary = async () => {
    if (!videoRef.current || !apiKey) return;
    
    // 1. Recopilar contexto histórico
    const historyText = detectedCycles.slice(0, 10).map(c => `- ${c.action} (${c.count} veces). Insight: ${c.insight || 'N/A'}`).join('\n');
    const activeText = activeCycle ? `ACCIÓN ACTUAL EN CURSO: ${activeCycle.action} (Intensidad: ${activeCycle.intensity})` : "ACCIÓN ACTUAL: Ninguna/Pausa";
    
    const contextPrompt = `
      HISTORIAL DE ACCIONES RECIENTES:
      ${historyText}

      ${activeText}
    `;

    // 2. Obtener imagen actual
    const base64 = getSnapshot();
    if (!base64) return;

    setAnalyzing(true);
    addLog('system', '📖 Generando sinopsis de la trama...');

    try {
      const result = await runGeminiTests.analyzeImage(
        apiKey,
        'gemini-2.5-flash',
        base64,
        STORY_PROMPT + contextPrompt,
        true
      );

      if (result.success) {
        const data = cleanAndParseJson(result.data.output);
        setStoryContext({
          title: data.current_concept || "Capítulo Sin Título",
          synopsis: data.synopsis || "Análisis no disponible.",
          mood: data.mood || "Neutro",
          timestamp: new Date().toLocaleTimeString()
        });
        addLog('ai', `Sinopsis generada: "${data.current_concept}"`);
      } else {
        addLog('error', result.message);
      }
    } catch (e: any) {
      addLog('error', `Error generando historia: ${e.message}`);
    }
    setAnalyzing(false);
  };

  // --- FORENSIC ANALYSIS (Economical Text-Only) ---
  const analyzeGhostBuffer = async () => {
    if (!pauseStartTimeRef.current || pauseBufferRef.current.length === 0 || !apiKey) {
      addLog('system', 'Datos insuficientes para análisis forense.');
      return;
    }

    setAnalyzing(true);
    const endTime = Date.now();
    const durationSeconds = (endTime - pauseStartTimeRef.current) / 1000;
    const eventCount = pauseBufferRef.current.length;
    
    // Cálculo de Densidad
    const eventsPerSecond = eventCount / durationSeconds;
    const densityPercent = Math.min(100, (eventsPerSecond / 1) * 100); // Asumiendo 1 evento/seg como 100% (intervalo del loop)

    // Crear el prompt estadístico (TEXTO PLANO = BARATO)
    const statsPrompt = `
      STATS DE PERIODO CIEGO:
      - Duración: ${durationSeconds.toFixed(1)} segundos.
      - Eventos de Movimiento: ${eventCount}.
      - Densidad de Actividad: ${densityPercent.toFixed(1)}%.
    `;

    addLog('system', `🔎 Enviando resumen estadístico a IA... (${eventCount} eventos en ${durationSeconds.toFixed(0)}s)`);

    try {
      // Inyectar imagen vacía (1x1 pixel PNG)
      // NOTA: analyzeImage ahora detecta el MIME type automáticamente, así que el PNG funcionará.
      const dummyPixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      
      const forensicRes = await runGeminiTests.analyzeImage(apiKey, 'gemini-2.5-flash', dummyPixel, FORENSIC_PROMPT + statsPrompt, true);
      
      if (forensicRes.success) {
        const data = cleanAndParseJson(forensicRes.data.output);
        const usage = forensicRes.data.usage || {};

        addLog('forensic', `🧠 ANÁLISIS FORENSE: ${data.psychological_concept}`, usage.totalTokens);
        addLog('forensic', `📐 Patrón: ${data.automata_pattern} | Teoría: "${data.theory}"`);
        
        // Limpiar buffer tras análisis exitoso
        pauseBufferRef.current = [];
        setPauseBufferCount(0);
        pauseStartTimeRef.current = Date.now(); // Reiniciar contador
      } else {
        addLog('error', forensicRes.message);
      }

    } catch (e: any) {
      addLog('error', `Error Forense: ${e.message}`);
    }
    setAnalyzing(false);
  };

  // --- ANÁLISIS CON GEMINI (VISUAL) ---
  const captureAndAnalyze = async () => {
    if (!videoRef.current || !apiKey) return;

    const base64 = getSnapshot();
    if (!base64) return;
    setCapturedImage(base64);

    setAnalyzing(true);
    
    const result = await runGeminiTests.analyzeImage(
      apiKey, 
      'gemini-2.5-flash', 
      base64, 
      NARRATIVE_PROMPT,
      true // JSON mode
    );
    
    if (result.success) {
      const usage = result.data.usage || {};
      const totalT = usage.totalTokens || 0;
      
      try {
        const jsonResponse = cleanAndParseJson(result.data.output);
        setNarrativeState(jsonResponse.progress_check);
        const actionLabel = jsonResponse.current_action || "Actividad desconocida";
        const insight = jsonResponse.repetition_interest;

        // --- LÓGICA DE DETECCIÓN DE CICLOS ---
        setActiveCycle(prev => {
          // Normalizar para comparación (ignorar mayus/minus leves)
          const isSameAction = prev && prev.action.toLowerCase() === actionLabel.toLowerCase();

          if (isSameAction) {
             // Es un LOOP: Incrementamos el contador y actualizamos el insight
             return { 
               ...prev, 
               count: prev.count + 1,
               intensity: prev.count > 5 ? 'high' : prev.count > 2 ? 'medium' : 'low',
               insight: insight || prev.insight // Actualizar insight si la IA provee uno nuevo
             };
          } else {
             // Es una NUEVA ACCIÓN:
             // 1. Si había un ciclo previo significativo, lo guardamos en el historial
             if (prev) {
                setDetectedCycles(history => [prev, ...history]);
             }
             
             // 2. Iniciamos el nuevo ciclo
             return {
               id: Date.now().toString(),
               action: actionLabel,
               count: 1,
               startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' }),
               intensity: 'low',
               insight: insight
             };
          }
        });

        if (jsonResponse.is_new_concept) {
           addLog('ai', `🎬 AVANCE: ${jsonResponse.narrative_output}`, totalT);
        } else {
           addLog('system', `⏳ Loop: ${actionLabel}`, totalT);
        }
      } catch (e) {
        addLog('error', `Error interpretando IA: ${result.data.output?.substring(0, 50)}...`, totalT);
      }

      setTokenStats(prev => ({
        prompt: prev.prompt + (usage.promptTokens || 0),
        response: prev.response + (usage.responseTokens || 0),
        total: prev.total + totalT
      }));
    } else {
      addLog('error', `Error IA: ${result.message}`);
    }
    setAnalyzing(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-12">
      
      {/* HEADER & STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg"><Aperture size={24} /></div>
              <div>
                <h2 className="text-xl font-bold">Live Vision Director</h2>
                <p className="text-teal-100 text-xs">Reconocimiento de Patrones & Ciclos de Conducta</p>
              </div>
            </div>
            
            {/* INDICADOR DE ESTADO FILOSÓFICO */}
            <div className="flex flex-col gap-2 items-end">
              <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 font-bold text-xs transition-all duration-300 ${
                isPaused ? 'bg-yellow-500/20 border-yellow-400 text-yellow-100' :
                systemState === 'monitoring' ? 'bg-green-500/20 border-green-400 text-white animate-pulse' :
                systemState === 'sleeping' ? 'bg-indigo-900/40 border-indigo-400 text-indigo-200' :
                'bg-slate-500/20 border-slate-400 text-slate-300'
              }`}>
                {isPaused ? <><Eye size={12}/> LOCAL ONLY</> :
                 systemState === 'monitoring' ? <><Activity size={12}/> VIGILANDO</> :
                 systemState === 'sleeping' ? <><EyeOff size={12}/> DORMIDO</> :
                 <><Zap size={12}/> OFF</>}
              </div>
            </div>
          </div>
        </div>

        {/* CONTADOR DE TOKENS */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
           <div className="flex items-center gap-2 text-slate-500 mb-2 uppercase text-xs font-bold">
             <Coins size={14} className="text-yellow-500" /> Consumo de Sesión
           </div>
           <div className="flex items-baseline gap-1">
             <span className="text-3xl font-mono font-bold text-slate-800">{tokenStats.total.toLocaleString()}</span>
             <span className="text-xs text-slate-400">tokens</span>
           </div>
           <div className="mt-2 text-xs flex justify-between text-slate-400">
              <span>Narraciones: {logs.filter(l => l.type === 'ai').length}</span>
              <span>Costo est: ${(tokenStats.total * 0.0000001).toFixed(6)}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        
        {/* COL 1: CÁMARA */}
        <div className="lg:col-span-1 bg-black rounded-xl overflow-hidden shadow-lg relative flex items-center justify-center group h-full border border-slate-800">
          {!isCameraActive && (
            <div className="text-center z-10">
              <Camera size={48} className="text-slate-700 mx-auto mb-4" />
              <button onClick={startCamera} className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-full transition-all flex items-center gap-2 mx-auto">
                <Play size={18} fill="currentColor" /> Iniciar Cámara
              </button>
              {errorMsg && <p className="text-red-400 text-xs mt-2 max-w-xs mx-auto">{errorMsg}</p>}
            </div>
          )}
          
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0 hidden'} ${systemState === 'sleeping' && !isPaused ? 'grayscale opacity-60' : ''}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* OVERLAYS */}
          {isCameraActive && systemState === 'sleeping' && !isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
              <div className="bg-black/70 text-white px-6 py-3 rounded-full flex items-center gap-3 border border-white/10 animate-pulse">
                 <BatteryCharging className="text-green-400" />
                 <span>Ahorrando Recursos...</span>
              </div>
            </div>
          )}

          {isCameraActive && isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-yellow-900/10 backdrop-blur-[1px] pointer-events-none border-4 border-yellow-500/20 rounded-xl">
              <div className="bg-yellow-500 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-xl">
                 <Eye fill="currentColor" />
                 <span className="font-bold">IA PAUSADA</span>
              </div>
            </div>
          )}

          {/* CONTROLES */}
          {isCameraActive && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 z-20">
              
              {/* BOTÓN FORENSE (Solo visible si hay datos en buffer) */}
              {(isPaused || pauseBufferCount > 0) && (
                <button 
                  onClick={analyzeGhostBuffer}
                  disabled={analyzing || pauseBufferCount === 0}
                  className={`p-3 rounded-full text-white border transition-all ${
                    pauseBufferCount > 0 
                      ? 'bg-purple-600 border-purple-400 hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' 
                      : 'bg-white/10 border-white/20 opacity-50'
                  }`}
                  title="Analizar buffer fantasma (Económico)"
                >
                  <Microscope size={24} />
                  {pauseBufferCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border border-black">
                      {pauseBufferCount > 99 ? '99+' : pauseBufferCount}
                    </span>
                  )}
                </button>
              )}

              <button 
                onClick={captureAndAnalyze} 
                disabled={analyzing || isPaused} 
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white border border-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Captura Manual"
              >
                <RefreshCw size={24} className={analyzing ? 'animate-spin' : ''} />
              </button>

              <button 
                onClick={generateStorySummary} 
                disabled={analyzing || isPaused} 
                className="p-3 bg-teal-500/80 hover:bg-teal-400 rounded-full text-white border border-teal-400 disabled:opacity-30 disabled:cursor-not-allowed"
                title="📖 Historia hasta ahora (Resumen)"
              >
                <BookOpen size={24} />
              </button>

              <button 
                onClick={togglePause} 
                className={`p-3 rounded-full text-white border transition-all ${isPaused ? 'bg-yellow-500 border-yellow-400 hover:bg-yellow-400' : 'bg-white/10 border-white/20 hover:bg-white/20'}`}
                title={isPaused ? "Reanudar" : "Pausar IA"}
              >
                {isPaused ? <Play fill="currentColor" size={24} /> : <Pause fill="currentColor" size={24} />}
              </button>
              <button 
                onClick={stopCamera} 
                className="p-3 bg-red-500/80 hover:bg-red-600 rounded-full text-white border border-red-400"
                title="Apagar Cámara"
              >
                <Zap size={24} fill="currentColor" />
              </button>
            </div>
          )}
        </div>

        {/* COL 2: DETECCIÓN DE PATRONES (NUEVO) */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
             <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><Repeat size={18}/></div>
             <h3 className="font-bold text-slate-700">Patrones & Insights</h3>
          </div>
          
          <div ref={cycleListRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
             {/* ACTIVE CYCLE CARD */}
             {activeCycle && (
               <div className="bg-white border-2 border-purple-500 shadow-md rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider flex items-center gap-1">
                      <Activity size={12} className="animate-pulse"/> Ciclo Activo
                    </span>
                    <span className="text-xs font-mono text-slate-400">{activeCycle.startTime}</span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 leading-tight mb-1">{activeCycle.action}</h4>
                  
                  {/* INSIGHT SECTION */}
                  {activeCycle.insight && (
                    <div className="mt-3 bg-purple-50 p-2.5 rounded-lg border border-purple-100 flex items-start gap-2">
                      <Sparkles size={14} className="text-purple-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-purple-800 font-medium italic leading-relaxed">
                        "{activeCycle.insight}"
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                     <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 transition-all duration-500 ease-out" 
                          style={{ width: `${Math.min(100, activeCycle.count * 10)}%` }}
                        />
                     </div>
                     <span className="text-xl font-bold text-purple-600 min-w-[30px] text-right">x{activeCycle.count}</span>
                  </div>
               </div>
             )}

             {/* HISTORY LIST */}
             {detectedCycles.length > 0 && (
               <>
                 <div className="text-xs font-bold text-slate-400 uppercase mt-4 mb-2 flex items-center gap-2">
                   <Layers size={12}/> Historial de Loops
                 </div>
                 {detectedCycles.map((cycle) => (
                   <div key={cycle.id} className="bg-white border border-slate-200 rounded-lg p-3 opacity-90 hover:opacity-100 transition-opacity flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs text-slate-400 font-mono mb-0.5">{cycle.startTime}</div>
                          <div className="font-medium text-slate-700 text-sm">{cycle.action}</div>
                        </div>
                        <div className={`px-2 py-1 rounded-lg font-bold text-xs ${
                          cycle.intensity === 'high' ? 'bg-red-100 text-red-700' :
                          cycle.intensity === 'medium' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          x{cycle.count}
                        </div>
                      </div>
                      
                      {cycle.insight && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-50 pt-2">
                           <Lightbulb size={12} className="text-yellow-500 shrink-0"/>
                           <span className="italic truncate">{cycle.insight}</span>
                        </div>
                      )}
                   </div>
                 ))}
               </>
             )}

             {!activeCycle && detectedCycles.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                 <Search size={32} className="mb-2" />
                 <p className="text-xs text-center max-w-[150px]">Analizando el significado detrás de la repetición...</p>
               </div>
             )}
          </div>
        </div>

        {/* COL 3: LOG NARRATIVO */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
             <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={16}/> Narrativa</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-0 bg-slate-50/50">
             
             {/* CONTEXT CARD (CHECK-IN) */}
             {storyContext && (
               <div className="mx-4 mt-4 bg-teal-50 border border-teal-100 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-2 mb-2 text-teal-700">
                    <BookOpen size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Sinopsis en Curso</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-2">"{storyContext.title}"</h4>
                  <p className="text-xs text-slate-600 italic leading-relaxed mb-3">
                    {storyContext.synopsis}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-teal-600/70 border-t border-teal-100 pt-2">
                    <span className="font-bold flex items-center gap-1"><Zap size={10}/> Mood: {storyContext.mood}</span>
                    <span className="font-mono">{storyContext.timestamp}</span>
                  </div>
               </div>
             )}

             {logs.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                 <FileText size={32} className="mb-2 opacity-20" />
                 <p className="text-sm">Registro de eventos.</p>
               </div>
             ) : (
               <div className="flex flex-col mt-2">
                 {logs.map((log) => (
                   <div key={log.id} className={`px-4 py-3 border-b border-slate-100 text-sm flex gap-3 ${
                     log.type === 'error' ? 'bg-red-50' : 
                     log.type === 'ai' ? 'bg-purple-50' : 
                     log.type === 'forensic' ? 'bg-indigo-900 text-indigo-100' :
                     log.type === 'system' ? 'bg-slate-100/50' :
                     log.type === 'user' ? 'bg-blue-50/50' : 'bg-transparent'
                   }`}>
                     <span className={`text-xs font-mono shrink-0 mt-0.5 ${log.type === 'forensic' ? 'text-indigo-300' : 'text-slate-400'}`}>{log.time}</span>
                     <div className="flex-1">
                        <div className={`font-medium mb-0.5 ${
                          log.type === 'error' ? 'text-red-700' : 
                          log.type === 'ai' ? 'text-purple-700 font-bold' : 
                          log.type === 'forensic' ? 'text-white font-bold flex items-center gap-2' :
                          log.type === 'system' ? 'text-slate-500 italic' :
                          log.type === 'user' ? 'text-blue-700' : 'text-slate-600'
                        }`}>
                          {log.type === 'forensic' && <BrainCircuit size={14} className="text-pink-400" />}
                          {log.message}
                        </div>
                     </div>
                   </div>
                 ))}
                 <div ref={logEndRef} />
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
