import React from 'react';
import { Users, GitCommit, Target, AlertOctagon, Network } from 'lucide-react';
import { CaseSummary } from './types';

interface SummaryKpisProps {
  summary?: CaseSummary | null;
  nodesCount: number;
  edgesCount: number;
  keyIndividualsCount: number;
  anomaliesCount: number;
  communitiesCount: number;
}

export const SummaryKpis: React.FC<SummaryKpisProps> = ({
  summary,
  nodesCount,
  edgesCount,
  keyIndividualsCount,
  anomaliesCount,
  communitiesCount
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 px-4 py-2 bg-zinc-950/60 border-b border-zinc-800/80">
      
      {/* Total Entities */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/70 shadow-sm">
        <div className="p-2 rounded-md bg-indigo-950/60 border border-indigo-700/40 text-indigo-400">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Entities</div>
          <div className="text-lg font-bold text-zinc-100 font-mono leading-tight">
            {nodesCount || (summary?.total_nodes ?? 0)}
          </div>
        </div>
      </div>

      {/* Relationships */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/70 shadow-sm">
        <div className="p-2 rounded-md bg-cyan-950/60 border border-cyan-700/40 text-cyan-400">
          <GitCommit className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Connections</div>
          <div className="text-lg font-bold text-zinc-100 font-mono leading-tight">
            {edgesCount || (summary?.total_edges ?? 0)}
          </div>
        </div>
      </div>

      {/* Key Targets */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/70 shadow-sm">
        <div className="p-2 rounded-md bg-purple-950/60 border border-purple-700/40 text-purple-400">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">People to Review</div>
          <div className="text-lg font-bold text-purple-300 font-mono leading-tight">
            {keyIndividualsCount}
          </div>
        </div>
      </div>

      {/* Flagged Anomalies */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/70 shadow-sm">
        <div className="p-2 rounded-md bg-red-950/60 border border-red-700/40 text-red-400">
          <AlertOctagon className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Activity to Review</div>
          <div className="text-lg font-bold text-red-400 font-mono leading-tight">
            {anomaliesCount || (summary?.total_anomalies ?? 0)}
          </div>
        </div>
      </div>

      {/* Syndicate Cells */}
      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/70 shadow-sm col-span-2 sm:col-span-1">
        <div className="p-2 rounded-md bg-amber-950/60 border border-amber-700/40 text-amber-400">
          <Network className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Groups Identified</div>
          <div className="text-lg font-bold text-amber-400 font-mono leading-tight">
            {communitiesCount || (summary?.total_communities ?? 0)}
          </div>
        </div>
      </div>

    </div>
  );
};
