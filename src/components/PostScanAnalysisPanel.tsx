import React, { useState } from 'react';
import { PostScanAiAnalysis } from '../types';
import {
  BrainCircuit,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  MapPin,
  Layers,
  Cpu,
  CheckCircle2,
} from 'lucide-react';

interface PostScanAnalysisPanelProps {
  visible: boolean;
  sceneName: string | null;
  targetsFoundCount: number;
  missionTime: number;
  analysis: PostScanAiAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onGenerateAnalysis: () => void;
  onOpenSwarmAi: (seedPrompt?: string) => void;
}

type AnalysisSubTab = 'brief' | 'zones' | 'extractions' | 'dispatch';

export const PostScanAnalysisPanel: React.FC<PostScanAnalysisPanelProps> = ({
  visible,
  sceneName,
  targetsFoundCount,
  missionTime,
  analysis,
  isLoading,
  error,
  onGenerateAnalysis,
  onOpenSwarmAi,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisSubTab>('brief');

  // Strictly visible ONLY after scan is 100% COMPLETE and targets are found
  if (!visible) {
    return null;
  }

  const mins = Math.floor(missionTime / 60);
  const secs = Math.floor(missionTime % 60);
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const severityStyles: Record<string, string> = {
    CRITICAL: 'text-red-300 bg-red-600/20 border-red-500/60',
    HIGH: 'text-amber-300 bg-amber-500/15 border-amber-500/50',
    MODERATE: 'text-zinc-200 bg-zinc-800 border-zinc-600',
    LOW: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40',
    CLEAR: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40',
  };

  return (
    <section
      aria-label="Post-Scan Get AI Analysis"
      className="bg-[#0b0c10] border border-red-600/50 rounded-xl shadow-[0_12px_36px_-14px_rgba(220,38,38,0.45)] overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-4 sm:px-5 py-3.5 bg-[#101118] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-red-500 shrink-0" />
            <h3 className="text-sm font-bold text-white tracking-tight">Get AI Analysis</h3>
          </div>
          <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-2 tabular-nums">
            <span>Scan Complete (100%)</span>
            <span aria-hidden="true">/</span>
            <span className="text-red-400 font-semibold">{targetsFoundCount} Targets Found</span>
            <span aria-hidden="true">/</span>
            <span className="font-mono">{formattedTime} Elapsed</span>
            {sceneName && (
              <>
                <span aria-hidden="true">/</span>
                <span className="truncate max-w-[260px] text-zinc-300">{sceneName}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onGenerateAnalysis}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-[0_0_20px_-4px_rgba(220,38,38,0.65)] transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analyzing Scan...</span>
              </>
            ) : analysis ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate Analysis</span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>Generate AI Analysis</span>
              </>
            )}
          </button>

          <button
            onClick={() =>
              onOpenSwarmAi(
                analysis
                  ? `Based on the completed scan of ${sceneName || 'the active tactical grid'} (${targetsFoundCount} targets found) where overall severity is ${analysis.severityRating}, give me a deeper breakdown of rescue execution and swarm performance.`
                  : `Analyze the completed scan (${targetsFoundCount} targets found in ${formattedTime}) and walk through priority extraction and swarm performance.`
              )
            }
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161720] hover:bg-[#1e202b] border border-zinc-700 hover:border-red-500/50 text-zinc-200 font-semibold text-xs transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Open Swarm AI</span>
            <ArrowRight className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {error && (
          <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-500/60 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-red-100">AI Analysis Error</div>
              <p className="text-red-200/90 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {!analysis && !isLoading && !error && (
          <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-zinc-300">
            <p className="leading-relaxed max-w-2xl">
              Your full 30×20 zone sweep is complete with{' '}
              <strong className="text-white tabular-nums">{targetsFoundCount} verified targets</strong>.
              Generate a Gemini Vision & telemetry intelligence report covering severity triage, zone
              failover performance, ranked extraction order, and dispatch recommendations.
            </p>
          </div>
        )}

        {isLoading && !analysis && (
          <div className="py-6 flex items-center gap-3 text-xs text-red-400 font-mono">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>
              Correlating aerial frame pixels, {targetsFoundCount} target coordinates, and 5-drone telemetry via Gemini...
            </span>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {/* Sub-Tabs inside the Get AI Analysis box */}
            <div className="flex items-center gap-1 p-1 bg-[#06070a] border border-zinc-800 rounded-lg w-fit max-w-full overflow-x-auto">
              <button
                onClick={() => setActiveTab('brief')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'brief'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Executive Brief
              </button>
              <button
                onClick={() => setActiveTab('zones')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'zones'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Zone Matrix ({analysis.zoneAssessments.length})
              </button>
              <button
                onClick={() => setActiveTab('extractions')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'extractions'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Extraction Priority ({analysis.prioritizedExtractions.length})
              </button>
              <button
                onClick={() => setActiveTab('dispatch')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'dispatch'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Dispatch & Fleet Audit
              </button>
            </div>

            {activeTab === 'brief' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                  <div className="text-sm font-semibold text-white">
                    {analysis.operationalVerdict}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono font-bold whitespace-nowrap ${
                      severityStyles[analysis.severityRating] || severityStyles.HIGH
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    SEVERITY: {analysis.severityRating}
                  </span>
                </div>

                <p className="text-sm text-zinc-200 leading-relaxed">
                  {analysis.executiveSummary}
                </p>

                <div className="space-y-2 pt-1">
                  <div className="text-xs font-semibold text-zinc-300">Key Operational Findings</div>
                  <ul className="space-y-1.5 text-xs text-zinc-300">
                    {analysis.keyFindings.map((finding, i) => (
                      <li key={i} className="flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'zones' && (
              <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#06070a] text-zinc-400 border-b border-zinc-800">
                      <th className="py-2.5 px-3 font-semibold">Zone</th>
                      <th className="py-2.5 px-3 font-semibold">Drone</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Coverage</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Targets</th>
                      <th className="py-2.5 px-3 font-semibold">Risk</th>
                      <th className="py-2.5 px-3 font-semibold">Sector Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 text-zinc-200">
                    {analysis.zoneAssessments.map((z) => (
                      <tr key={z.zoneId} className="hover:bg-[#14161e]">
                        <td className="py-2.5 px-3 font-mono font-semibold text-red-400">
                          {z.zoneId}
                        </td>
                        <td className="py-2.5 px-3 font-mono">{z.droneId}</td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums">
                          {z.coveragePercent}%
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right tabular-nums">
                          {z.targetsDetected}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${
                              severityStyles[z.riskLevel] || severityStyles.MODERATE
                            }`}
                          >
                            {z.riskLevel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300 leading-relaxed">
                          {z.statusNote}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'extractions' && (
              <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#06070a] text-zinc-400 border-b border-zinc-800">
                      <th className="py-2.5 px-3 font-semibold">#</th>
                      <th className="py-2.5 px-3 font-semibold">Target</th>
                      <th className="py-2.5 px-3 font-semibold">Coordinates</th>
                      <th className="py-2.5 px-3 font-semibold">Recommended Asset</th>
                      <th className="py-2.5 px-3 font-semibold">Triage Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 text-zinc-200">
                    {analysis.prioritizedExtractions.map((item) => (
                      <tr key={`${item.rank}-${item.targetId}`} className="hover:bg-[#14161e]">
                        <td className="py-2.5 px-3 font-mono font-bold text-red-400 tabular-nums">
                          {item.rank}
                        </td>
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                          <span className="font-semibold text-white">{item.targetId}</span>{' '}
                          <span className="text-zinc-400">/ {item.targetType}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-rose-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0 text-red-400" />
                            {item.coordinates}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-emerald-400">
                          {item.recommendedAsset}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300 leading-relaxed">
                          {item.rationale}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'dispatch' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-red-400" />
                    <span>Field Dispatch Actions</span>
                  </div>
                  <ul className="space-y-2 text-xs text-zinc-200">
                    {analysis.dispatchRecommendations.map((cmd, idx) => (
                      <li
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#06070a] border border-zinc-800 leading-relaxed"
                      >
                        <span className="font-mono text-red-400 font-bold mr-2 tabular-nums">
                          0{idx + 1}.
                        </span>
                        {cmd}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2.5">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-red-400" />
                    <span>Swarm Engineering Audit</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#06070a] border border-zinc-800 space-y-1">
                      <div className="font-semibold text-zinc-200">Failover & Resilience</div>
                      <p className="text-zinc-400 leading-relaxed">
                        {analysis.swarmPerformanceAudit.resilienceNote}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#06070a] border border-zinc-800 space-y-1">
                      <div className="font-semibold text-zinc-200">Battery & Endurance</div>
                      <p className="text-zinc-400 leading-relaxed">
                        {analysis.swarmPerformanceAudit.batteryAndRangeNote}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#06070a] border border-zinc-800 space-y-1">
                      <div className="font-semibold text-zinc-200">Multi-Modal Sensor Fusion</div>
                      <p className="text-zinc-400 leading-relaxed">
                        {analysis.swarmPerformanceAudit.sensorFusionNote}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
              <span>Model: {analysis.model}</span>
              <span>Generated: {new Date(analysis.generatedAt).toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
