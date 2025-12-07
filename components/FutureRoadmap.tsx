
import React from 'react';
import { Music, Brain, Video, Code2, Server, Cpu, Info, Lightbulb } from 'lucide-react';

const ROADMAP_ITEMS = [
  {
    category: "Audio e Inmersión Sonora",
    priority: "Alta 🎵",
    icon: <Music className="w-6 h-6 text-pink-500" />,
    items: [
      { name: "MusicFX / MusicLM", desc: "Herramientas de Google Labs para generar pistas musicales completas a partir de texto." },
      { name: "Lyria", desc: "Modelo avanzado para generar melodías y voces de alta calidad con continuidad." },
      { name: "AudioLM", desc: "Para completar audio o generar continuaciones coherentes de sonidos y voces." }
    ]
  },
  {
    category: "Narrativa e Inteligencia de NPCs",
    priority: "Alta 🧠",
    icon: <Brain className="w-6 h-6 text-purple-500" />,
    items: [
      { name: "Cloud Natural Language API", desc: "Permite que los NPCs entiendan sintaxis y sentimiento para responder al contexto emocional." },
      { name: "Vertex AI (Gemini Pro)", desc: "Para generar diálogos dinámicos e infinitos basados en la personalidad del personaje." }
    ]
  },
  {
    category: "Generación de Video e Imágenes",
    priority: "Visuales 🎬",
    icon: <Video className="w-6 h-6 text-blue-500" />,
    items: [
      { name: "Google VEO / Lumiere", desc: "Generación de video con referencias espacio-tiempo para movimiento fluido." },
      { name: "Imagen 3", desc: "Generación de texturas o assets estáticos de alta calidad." }
    ]
  },
  {
    category: "Código y Desarrollo",
    priority: "Productividad 💻",
    icon: <Code2 className="w-6 h-6 text-green-500" />,
    items: [
      { name: "Project IDX", desc: "Entorno de desarrollo con IA para generar código full-stack y previsualizar apps." },
      { name: "Gemini Code Assist", desc: "Integración directa para escribir, depurar y explicar código complejo." }
    ]
  },
  {
    category: "Infraestructura y Gestión",
    priority: "Backend ⚙️",
    icon: <Server className="w-6 h-6 text-orange-500" />,
    items: [
      { name: "Google Sheets API", desc: "CMS ligero para balancear stats de juegos o diálogos." },
      { name: "Firebase Cloud Messaging", desc: "Para notificaciones y engagement." },
      { name: "Firebase Crashlytics", desc: "Para monitorear la salud del código." }
    ]
  },
  {
    category: "Hardware e IA Local",
    priority: "Edge AI ⚡",
    icon: <Cpu className="w-6 h-6 text-yellow-500" />,
    items: [
      { name: "Google Coral", desc: "Aceleradores de hardware (USB Accelerator) para correr modelos TensorFlow Lite localmente sin latencia." }
    ]
  }
];

export const FutureRoadmap = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Introduction Card */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-8 text-white shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <Lightbulb className="text-yellow-300" />
          Visión del Futuro
        </h2>
        <p className="text-indigo-100 max-w-2xl">
          Esta sección documenta las tecnologías experimentales y de vanguardia de Google que se integrarán en el proyecto para potenciar la inmersión, la narrativa y la productividad.
        </p>
      </div>

      {/* Grid of Technologies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ROADMAP_ITEMS.map((section, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                {section.icon}
                {section.category}
              </h3>
              <span className="text-xs font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-500">
                {section.priority}
              </span>
            </div>
            <div className="p-6 space-y-4">
              {section.items.map((item, i) => (
                <div key={i} className="group">
                  <h4 className="font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                    {item.name}
                  </h4>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Clarifications Footer */}
      <div className="bg-slate-100 rounded-xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
          <Info size={18} /> Aclaraciones Técnicas
        </h3>
        <ul className="space-y-2 text-sm text-slate-600 list-disc list-inside">
          <li>
            <strong>"Similar a 8n8":</strong> Probablemente referencia a herramientas de nicho, pero en el ecosistema Google, la herramienta reina es <strong>Project IDX</strong>.
          </li>
          <li>
            <strong>Google Opal:</strong> Se refiere a <strong>Google Coral</strong> (hardware para IA) o a la webcam Opal C1 (hardware externo). Asumimos Coral por el contexto de Edge AI.
          </li>
        </ul>
      </div>
    </div>
  );
};
