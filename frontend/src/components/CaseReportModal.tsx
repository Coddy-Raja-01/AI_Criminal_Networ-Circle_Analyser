import React from 'react';
import { X, Printer, Shield, AlertOctagon, Target } from 'lucide-react';
import { CaseDetail } from './types';

interface CaseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: CaseDetail | null;
}

export const CaseReportModal: React.FC<CaseReportModalProps> = ({
  isOpen,
  onClose,
  caseData
}) => {
  if (!isOpen || !caseData) return null;

  const { summary, key_individuals, anomalies, nodes, edges } = caseData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Modal Action Bar */}
        <div className="flex items-center justify-between p-3.5 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            <span className="font-bold text-sm text-zinc-100">
              Official Law Enforcement Intelligence Dossier
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-zinc-200 print:bg-white print:text-black">
          
          {/* Header */}
          <div className="border-b-2 border-red-500/80 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-950 text-red-300 border border-red-700 font-mono">
                CONFIDENTIAL // LAW ENFORCEMENT INTELLIGENCE
              </span>
              <span className="text-xs font-mono text-zinc-400">
                DATE: {new Date().toLocaleDateString('en-GB')}
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-zinc-100 uppercase">
              {summary.name}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              <b>Case ID:</b> {summary.case_id} | <b>Target Division:</b> NCRB / MHA Cyber Intelligence | <b>Dataset:</b> Synthetic Demo Dossier
            </p>
            <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
              {summary.description}
            </p>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-3 text-center text-xs font-mono">
            <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
              <div className="text-lg font-bold text-zinc-100">{nodes.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Entities Analyzed</div>
            </div>
            <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
              <div className="text-lg font-bold text-zinc-100">{edges.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Discovered Links</div>
            </div>
            <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
              <div className="text-lg font-bold text-purple-400">{key_individuals.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Key Targets</div>
            </div>
            <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
              <div className="text-lg font-bold text-red-400">{anomalies.length}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Flagged Anomalies</div>
            </div>
          </div>

          {/* Key Individuals Section */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2.5 flex items-center gap-1.5">
              <Target className="w-4 h-4" />
              <span>Ranked Key Individuals (Composite Centrality Analysis)</span>
            </h2>

            <div className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900/50">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-900 text-zinc-400 text-[10px] uppercase border-b border-zinc-800">
                  <tr>
                    <th className="p-2.5 w-12">Rank</th>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Centrality</th>
                    <th className="p-2.5">Cell</th>
                    <th className="p-2.5">Investigative Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 text-zinc-300">
                  {key_individuals.slice(0, 7).map((ki, idx) => (
                    <tr key={ki.id}>
                      <td className="p-2.5 font-bold text-zinc-100">#{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-zinc-100">{ki.label}</td>
                      <td className="p-2.5">{ki.type}</td>
                      <td className="p-2.5 font-bold text-purple-400">{ki.centrality_score.toFixed(2)}</td>
                      <td className="p-2.5">Cell #{ki.community_id}</td>
                      <td className="p-2.5 text-[11px] text-zinc-400">{ki.rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Flagged Anomalies Section */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2.5 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4" />
              <span>Critical Anomalies & Evidentiary Citations</span>
            </h2>

            <div className="space-y-2">
              {anomalies.map((a) => (
                <div key={a.id} className="p-3 bg-red-950/20 border border-red-900/60 rounded-lg text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-red-300 uppercase font-mono">{a.id.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold uppercase">
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-zinc-300 text-xs mb-1.5">{a.description}</p>
                  <div className="text-[10px] font-mono text-zinc-400">
                    <b>Evidence Anchors:</b> {a.evidence_refs.join(', ') || 'Direct pattern match'}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
