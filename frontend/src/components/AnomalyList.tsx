import React from 'react';
import { AlertOctagon, AlertTriangle, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { AnomalySchema } from './types';

interface AnomalyListProps {
  anomalies: AnomalySchema[];
  onSelectEvidence: (ref: string, entityIds: string[]) => void;
  activeEvidenceRef?: string | null;
}

export const AnomalyList: React.FC<AnomalyListProps> = ({
  anomalies,
  onSelectEvidence,
  activeEvidenceRef
}) => {
  return (
    <div className="flex flex-col h-full bg-zinc-950/80 border border-zinc-800/80 rounded-lg overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-900/80 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
            Activity to Review
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950/70 text-red-300 border border-red-800/60">
          {anomalies.length} items
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
        {anomalies.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-500 font-mono">
            No anomalies flagged in active dataset.
          </div>
        ) : (
          anomalies.map((anom) => {
            const isHigh = anom.severity.toLowerCase() === 'high';

            return (
              <div
                key={anom.id}
                className={`p-3 rounded-lg border transition-all ${
                  isHigh
                    ? 'bg-red-950/20 border-red-900/60 hover:border-red-700/80'
                    : 'bg-amber-950/20 border-amber-900/60 hover:border-amber-700/80'
                }`}
              >
                {/* Title & Severity */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {isHigh ? (
                      <AlertOctagon className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <span className="text-xs font-bold font-mono text-zinc-200 uppercase tracking-wide">
                      {anom.id.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider ${
                      isHigh
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {anom.severity}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-300 leading-relaxed mb-2.5">
                  {anom.description}
                </p>

                {/* Evidence Links */}
                {anom.evidence_refs && anom.evidence_refs.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/80">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1">
                      <LinkIcon className="w-3 h-3 text-zinc-500" />
                      <span>Related records:</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {anom.evidence_refs.map((ref) => {
                        const isActive = activeEvidenceRef === ref;
                        return (
                          <button
                            key={ref}
                            onClick={() => onSelectEvidence(ref, anom.entity_ids)}
                            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                              isActive
                                ? 'bg-red-500 text-white border-red-400 font-bold shadow-sm'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-500'
                            }`}
                            title="Highlight in Network Graph"
                          >
                            <span>{ref}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
