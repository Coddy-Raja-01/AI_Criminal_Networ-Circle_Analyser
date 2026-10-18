import React from 'react';
import { Target, AlertTriangle } from 'lucide-react';
import { KeyIndividualSchema } from './types';
import { TYPE_COLORS } from './GraphView';

interface KeyIndividualsProps {
  individuals: KeyIndividualSchema[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

export const KeyIndividuals: React.FC<KeyIndividualsProps> = ({
  individuals,
  selectedId,
  onSelect
}) => {
  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border border-zinc-800/80 rounded-lg overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-900/80 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            People to Review
          </h2>
        </div>
        <span className="text-[11px] font-mono text-zinc-400">
          {individuals.length} people
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {individuals.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500 font-mono">
            No key individuals ranked. Load a case or ingest intelligence to analyze.
          </div>
        ) : (
          individuals.map((ind, index) => {
            const isSelected = selectedId === ind.id;
            const rank = index + 1;
            const typeColor = TYPE_COLORS[ind.type] || '#818cf8';

            return (
              <div
                key={ind.id}
                onClick={() => onSelect(ind.id)}
                className={`group p-2.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-purple-950/30 border-purple-500/70 shadow-md shadow-purple-950/30'
                    : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-800/70 hover:border-zinc-700'
                }`}
              >
                {/* Title & Centrality Row */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex items-center justify-center w-5 h-5 rounded font-mono text-[11px] font-bold bg-zinc-800 text-zinc-300">
                      #{rank}
                    </span>
                    <span className="font-semibold text-xs text-zinc-100 truncate group-hover:text-purple-300 transition-colors">
                      {ind.label}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase shrink-0"
                      style={{
                        backgroundColor: `${typeColor}22`,
                        color: typeColor
                      }}
                    >
                      {ind.type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
                    <span className="text-zinc-400 text-[10px]">Score:</span>
                    <span className="font-bold text-purple-400">
                      {ind.centrality_score.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ind.centrality_score * 100)}%` }}
                  />
                </div>

                {/* Explainable Rationale */}
                <div className="text-[11px] text-zinc-300 leading-snug bg-zinc-950/60 p-1.5 rounded border border-zinc-800/60">
                  <span className="text-zinc-400 font-medium">Rationale: </span>
                  {ind.rationale}
                </div>

                {/* Footer Badges */}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-800/60 text-[10px] font-mono text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span>Cell #{ind.community_id}</span>
                    <span>·</span>
                    <span>PR: {ind.pagerank.toFixed(3)}</span>
                    <span>·</span>
                    <span>BC: {ind.betweenness.toFixed(3)}</span>
                  </div>

                  {ind.risk_flag && (
                    <span className="flex items-center gap-1 text-red-400 font-semibold uppercase">
                      <AlertTriangle className="w-3 h-3" /> Priority Hub
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
