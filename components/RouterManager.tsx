
import React, { useState } from 'react';
import { AuthLab } from './AuthLab';
import { FutureRoadmap } from './FutureRoadmap';
import { VoiceLab } from './VoiceLab';
import { FirestoreAdmin } from './FirestoreAdmin';
import { PromptManager } from './PromptManager';
import { StorageLab } from './StorageLab';
import { SheetsLab } from './SheetsLab';
import { JsonAdmin } from './JsonAdmin';
import { LiveVision } from './LiveVision';
import { SynthLab } from './SynthLab';
import { ImageLab } from './ImageLab';
import { StatusCard } from './StatusCard';
import { Server, ShieldCheck, XCircle, Database, Bot, HardDrive } from 'lucide-react';

// Reuse types from original App logic or define here
export type AppMode = 'firebase' | 'gemini' | 'local' | 'auth_lab' | 'roadmap' | 'voice_lab' | 'db_admin' | 'prompt_manager' | 'storage' | 'sheets' | 'json_admin' | 'live_vision' | 'synth_lab' | 'image_lab';

interface RouterManagerProps {
  mode: AppMode;
  runFirebaseTests: () => void;
  runGeminiTests: () => void;
  runLocalTests: () => void;
  firebaseSteps: any[];
  geminiSteps: any[];
  localSteps: any[];
}

export const RouterManager: React.FC<RouterManagerProps> = ({ 
  mode, 
  runFirebaseTests, 
  runGeminiTests, 
  runLocalTests,
  firebaseSteps,
  geminiSteps,
  localSteps
}) => {
  
  // Logic to determine status of tests
  let currentSteps: any[] = [];
  if (mode === 'firebase') currentSteps = firebaseSteps;
  else if (mode === 'gemini') currentSteps = geminiSteps;
  else if (mode === 'local') currentSteps = localSteps;

  const allSuccess = currentSteps.length > 0 && currentSteps.every(s => s.status === 'success');
  const hasError = currentSteps.some(s => s.status === 'error');
  const isLoading = currentSteps.some(s => s.status === 'loading');

  switch (mode) {
    case 'auth_lab':
      return <AuthLab />;
    case 'prompt_manager':
      return <PromptManager />;
    case 'roadmap':
      return <FutureRoadmap />;
    case 'voice_lab':
      return <VoiceLab />;
    case 'live_vision':
      return <LiveVision />;
    case 'synth_lab':
      return <SynthLab />;
    case 'image_lab':
      return <ImageLab />;
    case 'db_admin':
      return <FirestoreAdmin />;
    case 'storage':
      return <StorageLab />;
    case 'sheets':
      return <SheetsLab />;
    case 'json_admin':
      return <JsonAdmin />;
    default:
      // This handles 'firebase', 'gemini', and 'local' views which share the "Status Card" layout
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4">
           <div className={`mb-8 p-4 rounded-xl border shadow-sm flex items-center gap-4 transition-colors duration-500 ${
              hasError 
                ? 'bg-red-50 border-red-100 text-red-800' 
                : allSuccess && !isLoading && mode !== 'local'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600'
            }`}>
              {hasError ? (
                <div className="bg-red-100 p-2 rounded-full"><XCircle size={24} /></div>
              ) : allSuccess && !isLoading && mode !== 'local' ? (
                <div className="bg-emerald-100 p-2 rounded-full"><ShieldCheck size={24} /></div>
              ) : (
                  <div className="bg-slate-100 p-2 rounded-full"><Server size={24} className={isLoading ? "animate-pulse" : ""} /></div>
              )}
              
              <div>
                <h2 className="font-bold text-lg">
                  {hasError ? 'Diagnóstico Fallido' : allSuccess && !isLoading && mode !== 'local' ? 'Sistema Operativo' : 'Estado del Diagnóstico'}
                </h2>
                <p className="text-sm opacity-90">
                  {hasError 
                    ? 'Se encontraron problemas durante la ejecución.' 
                    : allSuccess && !isLoading && mode !== 'local'
                      ? 'Todas las pruebas pasaron exitosamente.' 
                      : 'Listo para iniciar pruebas.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {currentSteps.map((step) => (
                <StatusCard
                  key={step.id}
                  title={step.title}
                  description={step.description}
                  status={step.status}
                  details={step.details}
                />
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={mode === 'firebase' ? runFirebaseTests : mode === 'gemini' ? runGeminiTests : runLocalTests}
                disabled={isLoading}
                className={`flex items-center gap-2 px-6 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl ${
                  mode === 'firebase' 
                    ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' 
                    : mode === 'gemini' 
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                      : 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                }`}
              >
                {isLoading ? <Server size={18} className="animate-spin" /> : mode === 'firebase' ? <Database size={18} /> : mode === 'gemini' ? <Bot size={18} /> : <HardDrive size={18} />}
                {isLoading ? 'Ejecutando...' : 'Iniciar Diagnóstico'}
              </button>
            </div>
        </div>
      );
  }
};
