import React from 'react';
import {
  Search,
  UploadCloud,
  FileText,
  Zap,
  UserCheck,
  ShieldCheck,
  Info,
  Maximize
} from 'lucide-react';

interface NavbarProps {
  role: 'investigator' | 'admin';
  onRoleChange: (role: 'investigator' | 'admin') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLoadSample: () => void;
  onOpenUpload: () => void;
  onOpenReport: () => void;
  onToggleFullscreen: () => void;
  loading: boolean;
  regionalWarning?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  role,
  onRoleChange,
  searchQuery,
  onSearchChange,
  onLoadSample,
  onOpenUpload,
  onOpenReport,
  onToggleFullscreen,
  loading,
  regionalWarning
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-4 py-2.5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 max-w-[1920px] mx-auto">
        
        {/* Brand & Mandate */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
            <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                Bharat SecureX AI
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wider rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase font-mono">
                NCRB · MHA
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                SYNTHETIC DATA
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-none mt-1">
              Find connections. Follow the evidence.
            </p>
          </div>
        </div>

        {/* Global Search */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search a person, phone, vehicle, or alias..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-900/90 border border-zinc-700/80 rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Action Controls & Role Switcher */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Regional Script Alert Badge (if detected) */}
          {regionalWarning && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-950/60 border border-amber-600/50 rounded text-amber-300 text-[11px]">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Regional Script Detected</span>
            </div>
          )}

          {/* Role Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-xs">
            <button
              onClick={() => onRoleChange('investigator')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
                role === 'investigator'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Restricted investigator view scoped to assigned case"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Investigator</span>
            </button>
            <button
              onClick={() => onRoleChange('admin')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors ${
                role === 'admin'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Admin view with cross-case linkage access"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* Load Sample Case Button (Demo Critical) */}
          <button
            onClick={onLoadSample}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50 transition-all border border-emerald-500 active:scale-95 disabled:opacity-50"
            title="Explore the included sample investigation"
          >
            <Zap className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : 'text-emerald-200 fill-emerald-200'}`} />
            <span>Try Demo Case</span>
          </button>

          {/* Ingest / Upload Modal Trigger */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>Add Files or Notes</span>
          </button>

          {/* Export Dossier Modal Trigger */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all"
            title="Create a report for this case"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Case Report</span>
          </button>

          <button
            onClick={onToggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all"
            title="Toggle full-screen workspace"
            aria-label="Toggle full-screen workspace"
          >
            <Maximize className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">Full screen</span>
          </button>
        </div>

      </div>
    </header>
  );
};
