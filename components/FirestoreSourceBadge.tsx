import React from 'react';
import { Database } from 'lucide-react';

interface FirestoreSourceBadgeProps {
  collectionName: string;
  className?: string;
}

export const FirestoreSourceBadge: React.FC<FirestoreSourceBadgeProps> = ({ collectionName, className = '' }) => {
  return (
    <div className={`group relative inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-full text-slate-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors cursor-help ${className}`}>
      <Database size={12} />
      <span className="text-[10px] font-mono font-medium max-w-[100px] truncate">
        {collectionName}
      </span>
      
      {/* Tooltip */}
      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        Registrado en: {collectionName}
        <svg className="absolute text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
           <polygon points="0,0 127.5,127.5 255,0" fill="currentColor"/>
        </svg>
      </span>
    </div>
  );
};