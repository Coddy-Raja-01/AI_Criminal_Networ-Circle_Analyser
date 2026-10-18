import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Clock,
  MapPin,
  Grid,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Minimize2,
  Maximize2
} from 'lucide-react';

import { Navbar } from './components/Navbar';
import { SummaryKpis } from './components/SummaryKpis';
import { GraphView } from './components/GraphView';
import { KeyIndividuals } from './components/KeyIndividuals';
import { AnomalyList } from './components/AnomalyList';
import { SidePanel } from './components/SidePanel';
import { TemporalHeatmap } from './components/TemporalHeatmap';
import { GeoHeatmap } from './components/GeoHeatmap';
import { CooccurrenceMatrix } from './components/CooccurrenceMatrix';
import { TimelineView } from './components/TimelineView';
import { ExtractionModal } from './components/ExtractionModal';
import { CaseReportModal } from './components/CaseReportModal';
import { CaseDetail, NodeSchema } from './components/types';

export default function App() {
  // Application State
  const [role, setRole] = useState<'investigator' | 'admin'>('investigator');
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Selection State
  const [selectedNode, setSelectedNode] = useState<NodeSchema | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [highlightedEdgeRef, setHighlightedEdgeRef] = useState<string | null>(null);

  // Active Bottom Tab
  const [bottomTab, setBottomTab] = useState<'temporal' | 'geo' | 'cooccurrence' | 'timeline'>('temporal');
  const [bottomExpanded, setBottomExpanded] = useState(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void document.documentElement.requestFullscreen();
  }, []);

  // 1. Initial Load / Fetch Sample Case
  const loadCaseData = useCallback(async (isInitial = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Fast sub-second sample demo endpoint
      const res = await axios.post<CaseDetail>('/api/demo/load-sample');
      setCaseData(res.data);
      if (!isInitial) {
        setStatusMsg("Bharat SecureX AI demo case loaded successfully!");
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err: any) {
      console.error("Load case error:", err);
      setErrorMsg("Failed to connect to backend intelligence services. Ensure FastAPI backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCaseData(true);
  }, [loadCaseData]);

  // Handle Node Click
  const handleSelectNode = (node: NodeSchema) => {
    setSelectedNode(node);
    setHighlightedNodeIds([node.id]);
    setHighlightedEdgeRef(null);
  };

  // Handle Search Query Filter / Selection
  useEffect(() => {
    if (!searchQuery.trim() || !caseData) {
      if (highlightedNodeIds.length > 0 && !selectedNode) {
        setHighlightedNodeIds([]);
      }
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const matches = caseData.nodes.filter(n =>
      n.label.toLowerCase().includes(q) ||
      n.id.toLowerCase().includes(q) ||
      JSON.stringify(n.attributes).toLowerCase().includes(q)
    );

    if (matches.length > 0) {
      setHighlightedNodeIds(matches.map(m => m.id));
      if (matches.length === 1) {
        setSelectedNode(matches[0]);
      }
    }
  }, [searchQuery, caseData]);

  // Handle Evidence Selection from Anomalies or Timeline
  const handleSelectEvidence = (ref: string, entityIds: string[]) => {
    setHighlightedEdgeRef(ref);
    setHighlightedNodeIds(entityIds);
    if (entityIds.length > 0 && caseData) {
      const target = caseData.nodes.find(n => n.id === entityIds[0]);
      if (target) setSelectedNode(target);
    }
  };

  return (
    <div className="flex min-h-screen w-screen flex-col overflow-x-hidden bg-zinc-950 font-sans text-zinc-100">
      <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100 select-none">
      
      {/* 1. Header / Navbar */}
      <Navbar
        role={role}
        onRoleChange={setRole}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLoadSample={() => loadCaseData(false)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onToggleFullscreen={toggleFullscreen}
        loading={loading}
        regionalWarning={caseData?.summary?.regional_language_warning}
      />

      {/* Status or Error Notifications */}
      {errorMsg && (
        <div className="bg-red-950/80 border-b border-red-700/80 px-4 py-2 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {statusMsg && (
        <div className="bg-emerald-950/80 border-b border-emerald-700/80 px-4 py-1.5 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <SummaryKpis
        summary={caseData?.summary}
        nodesCount={caseData?.nodes?.length ?? 0}
        edgesCount={caseData?.edges?.length ?? 0}
        keyIndividualsCount={caseData?.key_individuals?.length ?? 0}
        anomaliesCount={caseData?.anomalies?.length ?? 0}
        communitiesCount={caseData?.summary?.total_communities ?? 0}
      />

      {/* 3. Main Operational Work Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Upper Split: Network Graph (Left) + Intelligence Panels (Right) */}
        <div className={`flex flex-1 min-h-0 relative ${bottomExpanded ? 'hidden' : 'flex'}`}>
          
          {/* Main Network Graph (Largest Section) */}
          <div className="flex-1 relative h-full bg-zinc-950 min-w-0 border-r border-zinc-800/80">
            {loading && !caseData ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400 font-mono text-xs">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <span>Preparing your connections...</span>
              </div>
            ) : (
              <GraphView
                nodes={caseData?.nodes ?? []}
                edges={caseData?.edges ?? []}
                selectedNodeId={selectedNode?.id}
                onSelectNode={handleSelectNode}
                highlightedNodeIds={highlightedNodeIds}
                highlightedEdgeRef={highlightedEdgeRef}
              />
            )}
          </div>

          {/* Right Side: Key Individuals & Anomaly Panels */}
          <div className="w-96 shrink-0 flex flex-col h-full bg-zinc-950 overflow-hidden divide-y divide-zinc-800/80">
            
            {/* Upper Right: Key Individuals (Ranked by Centrality) */}
            <div className="h-1/2 min-h-0 p-1.5">
              <KeyIndividuals
                individuals={caseData?.key_individuals ?? []}
                selectedId={selectedNode?.id}
                onSelect={(id) => {
                  const n = caseData?.nodes.find(item => item.id === id);
                  if (n) handleSelectNode(n);
                }}
              />
            </div>

            {/* Lower Right: Flagged Anomalies */}
            <div className="h-1/2 min-h-0 p-1.5">
              <AnomalyList
                anomalies={caseData?.anomalies ?? []}
                onSelectEvidence={handleSelectEvidence}
                activeEvidenceRef={highlightedEdgeRef}
              />
            </div>
          </div>

          {/* Sliding Side Panel Inspector (Drawer) */}
          {selectedNode && (
            <div className="absolute right-0 top-0 bottom-0 z-30 shadow-2xl">
              <SidePanel
                node={selectedNode}
                edges={caseData?.edges ?? []}
                allNodes={caseData?.nodes ?? []}
                onClose={() => {
                  setSelectedNode(null);
                  setHighlightedNodeIds([]);
                  setHighlightedEdgeRef(null);
                }}
                onSelectNeighbor={handleSelectNode}
              />
            </div>
          )}
        </div>

        {/* 4. Bottom Tabbed Analytics Strip */}
        <div className={`border-t border-zinc-800 bg-zinc-950 flex flex-col transition-all ${
          bottomExpanded ? 'h-full' : 'h-72 sm:h-80'
        }`}>
          
          {/* Tab Navigation Header */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-900 border-b border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBottomTab('temporal')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                  bottomTab === 'temporal'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Activity by Time</span>
              </button>

              <button
                onClick={() => setBottomTab('geo')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                  bottomTab === 'geo'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Map Hotspots</span>
              </button>

              <button
                onClick={() => setBottomTab('cooccurrence')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                  bottomTab === 'cooccurrence'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <Grid className="w-3.5 h-3.5 text-purple-400" />
                <span>Shared Connections</span>
              </button>

              <button
                onClick={() => setBottomTab('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                  bottomTab === 'timeline'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Timeline</span>
              </button>
            </div>

            {/* Expand / Minimize Toggle */}
            <button
              onClick={() => setBottomExpanded(!bottomExpanded)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title={bottomExpanded ? "Minimize Panel" : "Maximize Panel"}
            >
              {bottomExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="flex-1 min-h-0 overflow-hidden bg-zinc-950">
            {bottomTab === 'temporal' && (
              <TemporalHeatmap data={caseData?.temporal_heatmap ?? []} />
            )}
            {bottomTab === 'geo' && (
              <GeoHeatmap points={caseData?.geo_heatmap ?? []} />
            )}
            {bottomTab === 'cooccurrence' && (
              <CooccurrenceMatrix
                data={caseData?.cooccurrence ?? { labels: [], entity_ids: [], matrix: [] }}
                onSelectEntity={(eid) => {
                  const n = caseData?.nodes.find(item => item.id === eid);
                  if (n) handleSelectNode(n);
                }}
              />
            )}
            {bottomTab === 'timeline' && (
              <TimelineView
                events={caseData?.timeline ?? []}
                onSelectEvidence={handleSelectEvidence}
              />
            )}
          </div>

        </div>

      </div>

      {/* 5. Modals */}
      <ExtractionModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        caseId={caseData?.summary?.case_id || "demo_case_001"}
        onDataCommitted={() => loadCaseData(false)}
      />

      <CaseReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        caseData={caseData}
      />

      </div>

      <footer className="border-t border-zinc-800 bg-zinc-950 px-4 py-4 text-center text-xs leading-relaxed text-zinc-400">
        <p>
          ©{' '}
          <strong>
            <i>
              all rights are reserved BharatSecureX AI- Priyabrata Chakraborty &amp; team,{' '}
              <a className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2" href="mailto:prbrtchkrbrt@gmail.com">
                prbrtchkrbrt@gmail.com
              </a>
            </i>
          </strong>
        </p>
      </footer>

    </div>
  );
}
