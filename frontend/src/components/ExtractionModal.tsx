import React, { useState } from 'react';
import axios from 'axios';
import {
  UploadCloud,
  FileText,
  X,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Database,
  Sparkles,
  Loader2
} from 'lucide-react';
import { ExtractionPreview } from './types';
import { TYPE_COLORS } from './GraphView';

interface ExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onDataCommitted: () => void;
}

export const ExtractionModal: React.FC<ExtractionModalProps> = ({
  isOpen,
  onClose,
  caseId,
  onDataCommitted
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  
  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [previewData, setPreviewData] = useState<ExtractionPreview | null>(null);
  const [committing, setCommitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Paste Intel State
  const [pastedText, setPastedText] = useState('');
  const [intelSource, setIntelSource] = useState('Intercepted Informant Tip');
  const [pasting, setPasting] = useState(false);

  if (!isOpen) return null;

  // Handle File Preview extraction
  const handlePreviewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setParsing(true);
    setErrorMsg(null);
    setPreviewData(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('case_id', caseId);

    try {
      const res = await axios.post<ExtractionPreview>('/api/upload/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreviewData(res.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to parse file. Check format and contents.');
    } finally {
      setParsing(false);
    }
  };

  // Commit extracted preview to graph
  const handleCommitPreview = async () => {
    if (!previewData) return;
    setCommitting(true);
    setErrorMsg(null);

    try {
      await axios.post('/api/upload/commit', {
        case_id: caseId,
        nodes: previewData.nodes_found,
        edges: previewData.edges_found
      });
      
      setSuccessMsg(`Successfully committed ${previewData.nodes_found.length} entities and ${previewData.edges_found.length} relationships to the active graph!`);
      setTimeout(() => {
        onDataCommitted();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to commit extracted data to graph.');
    } finally {
      setCommitting(false);
    }
  };

  // Handle Paste Intel incremental NER
  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    setPasting(true);
    setErrorMsg(null);

    try {
      await axios.post('/api/intel/paste', {
        case_id: caseId,
        text: pastedText,
        source_label: intelSource
      });
      setSuccessMsg("Intel processed! Extracted entities merged incrementally into graph.");
      setTimeout(() => {
        onDataCommitted();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || "Failed to process intel snippet.");
    } finally {
      setPasting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden text-zinc-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                Multi-Source Intelligence Ingestion Pipeline
              </h2>
              <p className="text-[11px] text-zinc-400">
                Add reports, call logs, or financial transaction files.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 px-4 text-xs font-medium">
          <button
            onClick={() => { setActiveTab('upload'); setPreviewData(null); }}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Upload Structured/Unstructured File</span>
          </button>
          <button
            onClick={() => { setActiveTab('paste'); setPreviewData(null); }}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'paste'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Paste Live Intel Snippet (Instant NER)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-700/80 rounded-lg text-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-700/80 rounded-lg text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: FILE UPLOAD */}
          {activeTab === 'upload' && !previewData && (
            <form onSubmit={handlePreviewFile} className="space-y-4">
              <div className="border-2 border-dashed border-zinc-800 hover:border-indigo-500/60 bg-zinc-900/40 rounded-xl p-6 text-center transition-all">
                <input
                  type="file"
                  id="file-upload"
                  accept=".pdf,.csv,.xlsx,.xls"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center cursor-pointer space-y-2"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-700/40 flex items-center justify-center text-indigo-400">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-zinc-200">
                    {selectedFile ? selectedFile.name : "Click to select or drag & drop files"}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Accepted formats: <b>PDF</b> (FIRs & Surveillance Reports), <b>CSV</b> (CDR Call Logs), <b>XLSX</b> (Financial Ledgers)
                  </p>
                </label>
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-zinc-200">{selectedFile.name}</span>
                    <span className="text-zinc-500">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button
                    type="submit"
                    disabled={parsing}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all disabled:opacity-50"
                  >
                    {parsing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Parsing Entities...</span>
                      </>
                    ) : (
                      <>
                        <span>Extract & Preview</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 1 CONFIRMATION VIEW: Extracted Entities Preview Table */}
          {activeTab === 'upload' && previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-700/50 p-3 rounded-lg text-xs">
                <div>
                  <div className="font-bold text-indigo-200 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span>Extraction Verification Confirmation View</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                    Source: {previewData.source_filename} ({previewData.file_type})
                  </div>
                </div>

                <div className="flex gap-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 bg-indigo-900/60 rounded text-indigo-200">
                    {previewData.nodes_found.length} Entities
                  </span>
                  <span className="px-2 py-0.5 bg-cyan-900/60 rounded text-cyan-200">
                    {previewData.edges_found.length} Relations
                  </span>
                </div>
              </div>

              {previewData.warnings && previewData.warnings.length > 0 && (
                <div className="p-2.5 bg-amber-950/60 border border-amber-700/60 rounded text-amber-200 text-xs">
                  {previewData.warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Table of pulled entities */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
                  Extracted Entities (Persons, Phones, Vehicles, Accounts)
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/50">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-900 text-zinc-400 text-[10px] uppercase border-b border-zinc-800 sticky top-0">
                      <tr>
                        <th className="p-2">Entity Label</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Entity ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                      {previewData.nodes_found.map((n) => (
                        <tr key={n.id} className="hover:bg-zinc-800/40">
                          <td className="p-2 font-bold text-zinc-100">{n.label}</td>
                          <td className="p-2">
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                              style={{
                                backgroundColor: `${TYPE_COLORS[n.type]}22`,
                                color: TYPE_COLORS[n.type] || '#a1a1aa'
                              }}
                            >
                              {n.type}
                            </span>
                          </td>
                          <td className="p-2 text-zinc-500">{n.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table of pulled edges */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
                  Extracted Edges & Evidence Anchors
                </div>
                <div className="max-h-36 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/50">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-900 text-zinc-400 text-[10px] uppercase border-b border-zinc-800 sticky top-0">
                      <tr>
                        <th className="p-2">Source</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Target</th>
                        <th className="p-2">Evidence Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                      {previewData.edges_found.slice(0, 15).map((e, idx) => (
                        <tr key={e.id || idx} className="hover:bg-zinc-800/40">
                          <td className="p-2 text-zinc-200 truncate max-w-[120px]">{e.source}</td>
                          <td className="p-2 font-bold text-cyan-400">{e.type}</td>
                          <td className="p-2 text-zinc-200 truncate max-w-[120px]">{e.target}</td>
                          <td className="p-2 text-zinc-500">{e.evidence_ref || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPreviewData(null)}
                  className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Back to Select File
                </button>
                <button
                  type="button"
                  onClick={handleCommitPreview}
                  disabled={committing}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 disabled:opacity-50"
                >
                  {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>Confirm & Commit to Graph</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE INTEL */}
          {activeTab === 'paste' && (
            <form onSubmit={handlePasteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Source / Document Label
                </label>
                <input
                  type="text"
                  value={intelSource}
                  onChange={(e) => setIntelSource(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  placeholder="e.g. Field Surveillance Note #77"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Paste Unstructured Field Intelligence / WhatsApp Intercept / Interrogation Notes
                </label>
                <textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full p-3 text-xs bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  placeholder="e.g. Informant confirms suspect Vikram Singh (+919876543210) met Dinesh Verma driving vehicle UP-32-CD-5678 to transfer cash to Sunita Rao at Sector 18 Noida..."
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-[11px] text-zinc-500 font-mono">
                  Runs spaCy NER, regex plate/phone extraction, and merges into graph.
                </span>
                <button
                  type="submit"
                  disabled={pasting || !pastedText.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {pasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Run NER & Merge into Graph</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
