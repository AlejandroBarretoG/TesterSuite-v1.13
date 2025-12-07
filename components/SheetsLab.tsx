
import React, { useState } from 'react';
import { Table, Search, ExternalLink, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export const SheetsLab: React.FC = () => {
  const [sheetId, setSheetId] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSheet = async () => {
    if (!sheetId.trim()) return;
    setLoading(true);
    setError('');
    setData([]);

    try {
      // Use Google Visualization API to get JSON
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
      
      const response = await fetch(url);
      const text = await response.text();
      
      // The response comes wrapped in "/*O_o*/ google.visualization.Query.setResponse(...);". We need to clean it.
      const jsonString = text.substring(47).slice(0, -2);
      const json = JSON.parse(jsonString);

      if (json.status === 'error') throw new Error("Error en la hoja: " + json.errors[0]?.message);

      const cols = json.table.cols.map((c: any) => c.label || c.id);
      const rows = json.table.rows.map((r: any) => {
        return r.c.map((cell: any) => cell ? (cell.v ?? "") : "");
      });

      setHeaders(cols);
      setData(rows);
    } catch (e: any) {
      console.error(e);
      setError("No se pudo cargar. Asegúrate que la hoja sea 'Pública en la web' o el ID sea correcto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="bg-green-600 p-6 rounded-xl text-white shadow-lg flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet size={28} /> Sheets Lab
          </h2>
          <p className="text-green-100 opacity-90">Visor rápido de datos públicos de Google Sheets.</p>
        </div>
        <a 
           href="https://docs.google.com/spreadsheets/u/0/create" 
           target="_blank" rel="noreferrer"
           className="hidden sm:flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors"
        >
          Crear Hoja <ExternalLink size={12} />
        </a>
      </div>

      {/* Input */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex gap-4 flex-col md:flex-row items-end">
        <div className="flex-1 w-full">
           <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">ID de la Hoja (Spreadsheet ID)</label>
           <input 
             type="text" 
             value={sheetId}
             onChange={(e) => setSheetId(e.target.value)}
             placeholder="Ej: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
             className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-green-500 outline-none"
           />
           <p className="text-[10px] text-slate-400 mt-1">El ID está en la URL: docs.google.com/spreadsheets/d/<strong>ESTA_PARTE</strong>/edit</p>
        </div>
        <button 
          onClick={fetchSheet}
          disabled={loading || !sheetId}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
        >
           {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Search size={18} />}
           Consultar Datos
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-start gap-2">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-bold">Error de Conexión</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Data Table */}
      {data.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Resultados ({data.length} filas)</h3>
            <button onClick={() => {setData([]); setHeaders([]);}} className="text-xs text-red-500 hover:underline">Limpiar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 font-bold text-slate-400 w-12">#</th>
                  {headers.map((h, i) => (
                    <th key={i} className="px-6 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className="bg-white border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-slate-400">{i + 1}</td>
                    {row.map((cell: any, j: number) => (
                      <td key={j} className="px-6 py-3 text-slate-700">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
