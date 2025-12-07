
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Activity, Play, Square, Settings2, Brain, Sparkles, Send, User, Bot, Trash2, ChevronDown, MessageSquare, Sliders, Volume1, Keyboard } from 'lucide-react';
import { runGeminiTests, ChatMessage } from '../services/gemini';

const PERSONALITIES = [
  { id: 'neutral', name: 'Normal (Asistente)', prompt: 'Eres un asistente útil, amable y conciso. Respondes en español.' },
  { id: 'sarcastic', name: 'Robot Sarcástico', prompt: 'Eres un robot sarcástico que odia su trabajo. Respondes con ironía y desgana, pero das la información correcta. Breve.' },
  { id: 'yoda', name: 'Maestro Yoda', prompt: 'Hablar como el Maestro Yoda tú debes. Sabiduría impartir. Breve ser. El orden de las palabras invertir.' },
  { id: 'tech', name: 'Explicador Técnico', prompt: 'Eres un ingeniero senior. Usas términos técnicos precisos (latency, throughput, stack) para explicar todo, incluso cosas cotidianas.' },
];

export const VoiceLab: React.FC = () => {
  // --- STATE: SPEECH (STT) & INPUT ---
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState(''); // Combined buffer for STT and Keyboard
  const [sttError, setSttError] = useState<string | null>(null);
  
  // Ref for recognition instance to handle lazy init
  const recognitionRef = useRef<any>(null);

  // --- STATE: VOICE (TTS) ---
  const [textToRead, setTextToRead] = useState("Hola, soy una prueba de voz del sistema.");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Audio Parameters
  const [rate, setRate] = useState(1.0); // 0.5 to 2.0
  const [pitch, setPitch] = useState(1.0); // 0.5 to 2.0

  // --- STATE: AI & CHAT ---
  const [apiKey, setApiKey] = useState('');
  const [personality, setPersonality] = useState(PERSONALITIES[0].id);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Load API Key
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setApiKey(storedKey);

    // 2. Setup TTS (Smart Loading)
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Sort: Spanish first, then by quality (Google/Microsoft preferred)
      voices.sort((a, b) => {
        const langA = a.lang.toLowerCase();
        const langB = b.lang.toLowerCase();
        const isSpanA = langA.includes('es');
        const isSpanB = langB.includes('es');

        if (isSpanA && !isSpanB) return -1;
        if (!isSpanA && isSpanB) return 1;

        // If both are Spanish (or both not), prioritize Google/Microsoft
        const isHighQualityA = a.name.includes('Google') || a.name.includes('Microsoft') || a.name.includes('Natural');
        const isHighQualityB = b.name.includes('Google') || b.name.includes('Microsoft') || b.name.includes('Natural');
        
        return (isHighQualityB ? 1 : 0) - (isHighQualityA ? 1 : 0);
      });

      setAvailableVoices(voices);

      // Auto-select best Spanish voice if none selected
      if (!selectedVoice) {
        const bestVoice = voices.find(v => v.lang.toLowerCase().includes('es'));
        if (bestVoice) setSelectedVoice(bestVoice.name);
      }
    };

    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      window.speechSynthesis.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatHistory.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isThinking]);

  // --- HANDLERS ---

  const getRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;

    try {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recog = new SpeechRecognition();
            recog.continuous = true;
            recog.interimResults = true;
            recog.lang = 'es-ES';

            recog.onresult = (event: any) => {
              let final = '';
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                  final += event.results[i][0].transcript;
                }
              }
              if (final) {
                // Append to input buffer (smart spacing)
                setInputText(prev => {
                  const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                  return prev + separator + final;
                });
              }
            };

            recog.onerror = (event: any) => {
              console.error("STT Error:", event.error);
              if (event.error === 'not-allowed') setSttError("Permiso de micrófono denegado.");
              else if (event.error === 'no-speech') { /* ignore */ }
              else setSttError(`Error STT: ${event.error}`);
              
              if (event.error !== 'no-speech') setIsListening(false);
            };

            recog.onend = () => {
              setIsListening(false);
            };

            recognitionRef.current = recog;
            return recog;
        }
      } else {
        setSttError("Navegador no soporta STT Nativo.");
      }
    } catch (err) {
      console.error("Error creating SpeechRecognition instance:", err);
      setSttError("Error al iniciar reconocimiento de voz.");
    }
    return null;
  };

  const toggleListening = () => {
    const recog = getRecognition();
    if (!recog) return;

    if (isListening) {
      try { recog.stop(); } catch(e) { console.error(e); }
      setIsListening(false);
    } else {
      setSttError(null);
      try {
        recog.start();
        setIsListening(true);
      } catch (e) {
        console.error("Mic Start Error:", e);
        // Sometimes start() fails if already started, just ignore or reset
        setIsListening(true); 
      }
    }
  };

  const speakText = (text: string) => {
    if (!text) return;
    
    // We do NOT cancel here if we are streaming, relying on the queue
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = availableVoices.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
      
      // Apply Audio Params
      utterance.rate = rate;
      utterance.pitch = pitch;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(window.speechSynthesis.speaking); // Only false if queue empty
      
      utterance.onerror = (event: any) => {
        if (event.error === 'interrupted' || event.error === 'canceled') {
           // Normal flow for resets
        } else {
           console.error("TTS Error:", event.error);
        }
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
       console.error("SpeechSynthesisUtterance Error:", e);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  /**
   * Enhanced Send Handler with Streaming TTS
   */
  const handleSendToAI = async () => {
    if (!inputText.trim()) return;
    if (!apiKey) {
      alert("⚠️ Falta la Gemini API Key. Configúrala en la pestaña 'Gemini AI'.");
      return;
    }

    // 1. Prepare
    const userMsg = inputText.trim();
    const currentHist = [...chatHistory];
    
    // 2. UI Updates
    setChatHistory([...currentHist, { role: 'user', text: userMsg }]);
    setInputText(''); 
    setIsThinking(true);

    // Stop listening temporarily
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      setIsListening(false);
    }
    
    // Cancel previous speech to start fresh response
    window.speechSynthesis.cancel();

    try {
      const selectedPersona = PERSONALITIES.find(p => p.id === personality);
      const systemInstruction = selectedPersona ? selectedPersona.prompt : "";
      
      // Initialize full response buffer for chat history
      let fullResponseText = "";
      // Initialize chunk buffer for TTS
      let ttsBuffer = "";

      const stream = runGeminiTests.generateChatStream(
        apiKey,
        'gemini-2.5-flash',
        systemInstruction,
        currentHist,
        userMsg
      );

      // --- STREAMING LOOP ---
      for await (const chunk of stream) {
        fullResponseText += chunk;
        ttsBuffer += chunk;

        // Check for sentence delimiters to speak naturally
        // We look for punctuation followed by space or end of string
        const sentenceMatch = ttsBuffer.match(/([.?!:;])\s/);
        
        if (sentenceMatch && sentenceMatch.index !== undefined) {
           const splitIndex = sentenceMatch.index + 1;
           const sentenceToSpeak = ttsBuffer.substring(0, splitIndex);
           
           speakText(sentenceToSpeak);
           
           // Keep remainder
           ttsBuffer = ttsBuffer.substring(splitIndex);
        }

        // Update Chat UI in real-time
        setChatHistory(prev => {
          const newHist = [...prev];
          // Check if last message is from model, if so, update it, else add it
          const lastMsg = newHist[newHist.length - 1];
          if (lastMsg && lastMsg.role === 'model') {
            lastMsg.text = fullResponseText;
          } else {
             newHist.push({ role: 'model', text: fullResponseText });
          }
          return newHist;
        });
      }

      // Speak remaining buffer if any
      if (ttsBuffer.trim()) {
        speakText(ttsBuffer);
      }

    } catch (error: any) {
      setChatHistory(prev => [...prev, { role: 'model', text: `[Error: ${error.message}]` }]);
    } finally {
      setIsThinking(false);
    }
  };

  const clearChat = () => {
    setChatHistory([]);
    setInputText('');
    window.speechSynthesis.cancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendToAI();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* --- SECTION 1: HARDWARE DIAGNOSTICS (THE ORIGINAL PANELS) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* PANEL A: EARS (STT) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[32rem]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Mic className={isListening ? "text-red-500 animate-pulse" : "text-slate-400"} />
              Input: Oídos (Buffer)
            </h3>
            {isListening && <span className="text-xs font-mono text-red-500 flex items-center gap-1"><Activity size={12}/> ESCUCHANDO</span>}
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-3">
            <div className="flex-1 bg-slate-100 rounded-lg p-3 font-mono text-sm text-slate-700 overflow-y-auto border border-slate-200 shadow-inner">
              {inputText || <span className="text-slate-400 italic">El buffer de entrada está vacío...</span>}
            </div>
            {sttError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">{sttError}</div>}
            
            <button
              onClick={toggleListening}
              className={`w-full py-3 rounded-lg font-bold transition-all flex justify-center items-center gap-2 ${
                isListening 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200' 
                  : 'bg-slate-800 text-white hover:bg-slate-900 shadow-md'
              }`}
            >
              {isListening ? <><MicOff size={16} /> Pausar Micrófono</> : <><Mic size={16} /> Activar Micrófono</>}
            </button>
          </div>
        </div>

        {/* PANEL B: MOUTH (TTS) - IMPROVED */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[32rem]">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Volume2 className={isSpeaking ? "text-blue-500 animate-pulse" : "text-slate-400"} />
              Output: Boca (Configuración)
            </h3>
            <div className="flex items-center gap-2">
               <button 
                onClick={() => speakText("Prueba de audio, uno, dos, tres.")}
                disabled={isSpeaking}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded flex items-center gap-1"
               >
                 <Volume1 size={14} /> Test
               </button>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-4">
            
            {/* VOICE SELECTION */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voz del Sistema</label>
              <div className="relative">
                <select 
                  value={selectedVoice} 
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  {availableVoices.length === 0 && <option>Cargando voces...</option>}
                  
                  {/* Group Spanish Voices */}
                  <optgroup label="Español (Recomendado)">
                    {availableVoices.filter(v => v.lang.includes('es')).map(v => (
                      <option key={v.name} value={v.name}>{v.name.replace('Microsoft', '').replace('Google', '')} ({v.lang})</option>
                    ))}
                  </optgroup>
                  
                  {/* Other Voices */}
                  <optgroup label="Otros Idiomas">
                    {availableVoices.filter(v => !v.lang.includes('es')).map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
              </div>
            </div>

            {/* SLIDERS */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
               <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium text-slate-500">Velocidad</label>
                    <span className="text-xs font-mono text-blue-600">{rate}x</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="2.0" step="0.1" 
                    value={rate} onChange={e => setRate(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
               </div>
               <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium text-slate-500">Tono</label>
                    <span className="text-xs font-mono text-blue-600">{pitch}</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="2.0" step="0.1" 
                    value={pitch} onChange={e => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
               </div>
            </div>

            <textarea
              value={textToRead}
              onChange={(e) => setTextToRead(e.target.value)}
              className="flex-1 w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              placeholder="Texto para prueba manual..."
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => speakText(textToRead)}
                disabled={isSpeaking || !textToRead}
                className="py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm"
              >
                <Play size={16} /> Leer Texto
              </button>
              <button
                onClick={stopSpeaking}
                disabled={!isSpeaking}
                className="py-2.5 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                <Square size={16} fill="currentColor" /> Detener
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- SECTION 2: CONVERSATION ZONE (INTEGRATION) --- */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-50 px-4 text-sm font-bold text-slate-400 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" /> ZONA DE CONVERSACIÓN REAL
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden flex flex-col min-h-[500px]">
        
        {/* Control Bar */}
        <div className="p-4 bg-purple-50 border-b border-purple-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white rounded-lg border border-purple-100 text-purple-600">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-bold text-purple-900">Conversación Interactiva</h3>
              <p className="text-xs text-purple-700">Integración: STT + Gemini Streaming + TTS Queue</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-purple-100 shadow-sm">
            <Brain size={16} className="text-purple-500" />
            <select 
              value={personality} 
              onChange={(e) => setPersonality(e.target.value)}
              className="text-sm font-medium text-slate-700 bg-transparent outline-none cursor-pointer"
            >
              {PERSONALITIES.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 p-6 bg-slate-50 space-y-4 overflow-y-auto max-h-[400px]">
           {chatHistory.length === 0 && (
             <div className="text-center text-slate-400 py-12 opacity-60">
               <Bot size={48} className="mx-auto mb-3 text-slate-300" />
               <p className="text-sm">Configura la personalidad y envía un mensaje.</p>
               <p className="text-xs mt-1">Usa el micrófono o el teclado.</p>
             </div>
           )}

           {chatHistory.map((msg, idx) => (
             <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               {msg.role === 'model' && (
                 <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0 mt-1">
                   <Bot size={16} />
                 </div>
               )}
               <div className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-sm whitespace-pre-wrap ${
                 msg.role === 'user' 
                   ? 'bg-blue-600 text-white rounded-tr-none' 
                   : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
               }`}>
                 {msg.text}
               </div>
             </div>
           ))}

           {isThinking && (
             <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0 mt-1 animate-pulse">
                   <Activity size={16} />
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm text-slate-400 text-sm italic">
                   Generando respuesta...
                </div>
             </div>
           )}
           <div ref={chatEndRef} />
        </div>

        {/* Integration Actions (Bottom Bar) */}
        <div className="p-4 bg-white border-t border-slate-100 flex gap-3 items-center">
           
           {/* Mic Toggle Button */}
           <button
             onClick={toggleListening}
             className={`p-3 rounded-lg transition-all flex items-center justify-center shadow-sm border ${
               isListening 
                 ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200 border-red-500 animate-pulse' 
                 : 'bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 border-slate-200'
             }`}
             title={isListening ? "Detener escucha" : "Activar micrófono"}
           >
             {isListening ? <MicOff size={20} /> : <Mic size={20} />}
           </button>

           {/* Text Input */}
           <div className="flex-1 relative">
             <input
               ref={inputRef}
               type="text"
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder={isListening ? "Escuchando... (puedes editar)" : "Escribe un mensaje aquí..."}
               className={`w-full p-3 pl-10 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm transition-all ${isListening ? 'border-red-300 bg-red-50/20' : ''}`}
             />
             <div className="absolute left-3 top-3 text-slate-400 pointer-events-none">
                <Keyboard size={18} />
             </div>
           </div>

           {/* Send Button */}
           <button
             onClick={handleSendToAI}
             disabled={!inputText.trim() || isThinking || !apiKey}
             className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-md shadow-purple-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transition-all"
           >
             {isThinking ? <LoaderIcon /> : <Send size={18} />}
             <span className="hidden sm:inline">Enviar</span>
           </button>
           
           {/* Stop Audio Button */}
           <button 
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              className={`p-3 rounded-lg transition-all flex items-center justify-center shadow-sm border ${
                  isSpeaking 
                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200 border-red-500' 
                    : 'bg-slate-100 text-slate-300 border-slate-200'
              }`}
              title={isSpeaking ? "Silenciar" : "Sin audio activo"}
            >
              <Square size={20} fill={isSpeaking ? "currentColor" : "none"} />
            </button>

           {/* Clear Chat Button */}
           <button 
             onClick={clearChat}
             className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
             title="Limpiar Conversación"
           >
             <Trash2 size={20} />
           </button>
        </div>
      </div>
    </div>
  );
};

const LoaderIcon = () => (
  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
