import React, { useState, useRef } from 'react';
import { Target } from '../types';
import { CALAMITY_SCENARIOS, analyzeUploadedImageForTargets } from '../satelliteAnalysis';
import {
  Upload,
  Image as ImageIcon,
  MapPin,
  X,
  CheckCircle2,
  Key,
  Dices,
  EyeOff,
  Waves,
  Building2,
  ShieldAlert,
  Cpu,
  Loader2,
  Crosshair,
} from 'lucide-react';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyImage: (
    imageUrl: string,
    imageName: string,
    sourceType: 'UPLOAD' | 'SATELLITE_PRESET' | 'GOOGLE_MAPS',
    detectedTargets: Target[]
  ) => void;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onApplyImage,
}) => {
  const [activeTab, setActiveTab] = useState<'flood' | 'earthquake' | 'upload' | 'google_maps'>('flood');
  const [previewUrl, setPreviewUrl] = useState<string | null>(CALAMITY_SCENARIOS[0].imageUrl);
  const [imageName, setImageName] = useState<string>(CALAMITY_SCENARIOS[0].title);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [detectedTargets, setDetectedTargets] = useState<Target[]>(CALAMITY_SCENARIOS[0].targets);

  // Google Maps inputs
  const [gmapsApiKey, setGmapsApiKey] = useState<string>('');
  const [gmapsCoords, setGmapsCoords] = useState<string>('12.9698,77.7499'); // CMRIT Bengaluru coordinates default
  const [gmapsZoom, setGmapsZoom] = useState<number>(18);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setPreviewUrl(url);
      runDetectionOnUrl(url);
    };
    reader.readAsDataURL(file);
  };

  const runDetectionOnUrl = (url: string) => {
    setAnalyzing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      analyzeUploadedImageForTargets(img, (targets) => {
        setDetectedTargets(targets);
        setAnalyzing(false);
      });
    };
    img.onerror = () => {
      setAnalyzing(false);
    };
    img.src = url;
  };

  const handleSelectScenario = (scenarioId: string) => {
    const scenario = CALAMITY_SCENARIOS.find((p) => p.id === scenarioId);
    if (!scenario) return;

    setPreviewUrl(scenario.imageUrl);
    setImageName(scenario.title);
    setDetectedTargets(scenario.targets);
  };

  const handlePickRandomScenario = (category?: 'FLOOD' | 'EARTHQUAKE') => {
    const pool = category
      ? CALAMITY_SCENARIOS.filter((s) => s.category === category)
      : CALAMITY_SCENARIOS;
    if (pool.length === 0) return;

    const randomIdx = Math.floor(Math.random() * pool.length);
    const scenario = pool[randomIdx];
    setPreviewUrl(scenario.imageUrl);
    setImageName(scenario.title);
    setDetectedTargets(scenario.targets);
  };

  const handleFetchGoogleMaps = () => {
    const [lat, lng] = gmapsCoords.split(',').map((s) => s.trim());
    if (!lat || !lng) return;

    let url = '';
    if (gmapsApiKey.trim()) {
      url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${gmapsZoom}&size=960x640&maptype=satellite&key=${gmapsApiKey.trim()}`;
    } else {
      url = CALAMITY_SCENARIOS[0].imageUrl;
    }

    setPreviewUrl(url);
    setImageName(`Google Satellite (${lat}, ${lng})`);
    runDetectionOnUrl(url);
  };

  const handleConfirm = () => {
    if (!previewUrl) return;

    const sourceType =
      activeTab === 'upload'
        ? 'UPLOAD'
        : activeTab === 'google_maps'
        ? 'GOOGLE_MAPS'
        : 'SATELLITE_PRESET';

    const cleanTargets = (detectedTargets || []).map((t) => ({
      ...t,
      found: false,
      assigned_drone: null,
    }));

    onApplyImage(previewUrl, imageName || 'Custom Satellite Recon', sourceType, cleanTargets);
    onClose();
  };

  const floodScenarios = CALAMITY_SCENARIOS.filter((s) => s.category === 'FLOOD');
  const earthquakeScenarios = CALAMITY_SCENARIOS.filter((s) => s.category === 'EARTHQUAKE');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#182235] border border-[#29374d] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#29374d] flex items-center justify-between bg-[#141d2e]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                Deploy Real Calamity & Satellite Reconnaissance
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AUTONOMOUS FLEET READY
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Photorealistic disaster photography. Targets remain 100% hidden until drones physically survey their 5 respective zones.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#222c3e] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Calamity Tabs */}
        <div className="flex items-center justify-between border-b border-[#29374d] bg-[#0e1624] px-6 text-xs overflow-x-auto">
          <div className="flex flex-nowrap min-w-max">
            <button
              onClick={() => {
                setActiveTab('flood');
                if (floodScenarios.length > 0 && !floodScenarios.some((s) => s.title === imageName)) {
                  handleSelectScenario(floodScenarios[0].id);
                }
              }}
              className={`py-3 px-4 font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'flood'
                  ? 'border-sky-400 text-sky-400 bg-sky-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Waves className="w-4 h-4 text-sky-400" />
              <span>Flood / Disaster</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-[#1e2a3c] text-sky-300">
                {floodScenarios.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('earthquake');
                if (earthquakeScenarios.length > 0 && !earthquakeScenarios.some((s) => s.title === imageName)) {
                  handleSelectScenario(earthquakeScenarios[0].id);
                }
              }}
              className={`py-3 px-4 font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'earthquake'
                  ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Earthquake / Rubble</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-[#1e2a3c] text-amber-300">
                {earthquakeScenarios.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`py-3 px-4 font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Upload Custom Photo</span>
            </button>

            <button
              onClick={() => setActiveTab('google_maps')}
              className={`py-3 px-4 font-semibold border-b-2 transition flex items-center gap-2 ${
                activeTab === 'google_maps'
                  ? 'border-purple-400 text-purple-400 bg-purple-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-4 h-4 text-purple-400" />
              <span>Google Maps Satellite</span>
            </button>
          </div>

          {(activeTab === 'flood' || activeTab === 'earthquake') && (
            <button
              onClick={() => handlePickRandomScenario(activeTab === 'flood' ? 'FLOOD' : 'EARTHQUAKE')}
              className="py-1.5 px-3 bg-[#1e2a3c] hover:bg-[#28374e] text-slate-200 rounded-lg transition flex items-center gap-1.5 font-mono text-[11px] border border-[#334259] shrink-0 ml-3"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span>Random {activeTab === 'flood' ? 'Flood' : 'Quake'} Scene</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: Flood & Inundation Calamities */}
          {activeTab === 'flood' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-300 bg-[#121a28] p-3 rounded-lg border border-[#29374d]">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold text-white">Top Flood & Inundation Calamity Scenes</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Select any image below or click "Random Flood Scene"
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {floodScenarios.map((scenario) => {
                  const isSelected = imageName === scenario.title;
                  return (
                    <div
                      key={scenario.id}
                      onClick={() => handleSelectScenario(scenario.id)}
                      className={`rounded-xl border cursor-pointer transition overflow-hidden group flex flex-col justify-between ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-400 shadow-xl ring-2 ring-sky-400/50'
                          : 'bg-[#121a28] border-[#29374d] hover:border-[#3d5172]'
                      }`}
                    >
                      <div className="relative h-32 w-full overflow-hidden bg-black">
                        <img
                          src={scenario.imageUrl}
                          alt={scenario.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-sky-300 font-mono text-[10px] font-bold border border-sky-500/30 backdrop-blur-sm flex items-center gap-1">
                          <Waves className="w-3 h-3 text-sky-400" />
                          FLOOD
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-500 text-white font-mono text-[10px] font-bold flex items-center gap-1 shadow">
                            <CheckCircle2 className="w-3 h-3" />
                            SELECTED
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-white text-xs leading-snug">{scenario.title}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{scenario.subtitle}</p>
                        </div>

                        <div className="pt-2 text-[10px] text-sky-400 font-mono flex items-center gap-1.5 border-t border-[#1e2a3c]">
                          <EyeOff className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-300">
                            {scenario.targets.length} Objectives hidden until drone scan
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Earthquake & Rubble Calamities */}
          {activeTab === 'earthquake' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-300 bg-[#121a28] p-3 rounded-lg border border-[#29374d]">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white">Top Earthquake & Structural Rubble Calamity Scenes</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Select any scene below or click "Random Quake Scene"
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {earthquakeScenarios.map((scenario) => {
                  const isSelected = imageName === scenario.title;
                  return (
                    <div
                      key={scenario.id}
                      onClick={() => handleSelectScenario(scenario.id)}
                      className={`rounded-xl border cursor-pointer transition overflow-hidden group flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 shadow-xl ring-2 ring-amber-400/50'
                          : 'bg-[#121a28] border-[#29374d] hover:border-[#3d5172]'
                      }`}
                    >
                      <div className="relative h-32 w-full overflow-hidden bg-black">
                        <img
                          src={scenario.imageUrl}
                          alt={scenario.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30 backdrop-blur-sm flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-amber-400" />
                          QUAKE
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-500 text-white font-mono text-[10px] font-bold flex items-center gap-1 shadow">
                            <CheckCircle2 className="w-3 h-3" />
                            SELECTED
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-white text-xs leading-snug">{scenario.title}</h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{scenario.subtitle}</p>
                        </div>

                        <div className="pt-2 text-[10px] text-amber-400 font-mono flex items-center gap-1.5 border-t border-[#1e2a3c]">
                          <EyeOff className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-300">
                            {scenario.targets.length} Objectives hidden until drone scan
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Upload Any Photo */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#374966] hover:border-emerald-500/60 rounded-xl p-8 text-center cursor-pointer transition bg-[#121a28]/60 hover:bg-[#121a28]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-10 h-10 text-emerald-400/80 mx-auto mb-2" />
                <div className="text-sm font-semibold text-white">
                  Click to select or drag and drop any calamity photo
                </div>
                <div className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Upload any photo from your computer (flood, earthquake, satellite, or aerial reconnaissance). The smart computer vision scanner will calibrate rescue objectives across all 5 swarm search zones. All targets stay completely invisible until drones survey them!
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Google Maps Satellite */}
          {activeTab === 'google_maps' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-[#121a28] border border-[#29374d] rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>Fetch Real Google Maps Satellite Imagery</span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-slate-400 block mb-1">Target Coordinates (Latitude, Longitude):</label>
                    <input
                      type="text"
                      value={gmapsCoords}
                      onChange={(e) => setGmapsCoords(e.target.value)}
                      placeholder="e.g. 12.9698, 77.7499 (CMRIT Bengaluru)"
                      className="w-full bg-[#0e1624] border border-[#29374d] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">
                      Google Maps API Key (Optional):
                    </label>
                    <div className="relative">
                      <Key className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        value={gmapsApiKey}
                        onChange={(e) => setGmapsApiKey(e.target.value)}
                        placeholder="AIzaSy... (leave blank to load default disaster satellite imagery)"
                        className="w-full bg-[#0e1624] border border-[#29374d] rounded-lg pl-9 pr-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-400">Satellite Zoom: {gmapsZoom}x</span>
                    <div className="flex gap-1.5">
                      {[16, 18, 20].map((z) => (
                        <button
                          key={z}
                          onClick={() => setGmapsZoom(z)}
                          className={`px-2 py-1 rounded text-xs font-mono ${
                            gmapsZoom === z
                              ? 'bg-purple-600 text-white font-bold'
                              : 'bg-[#182235] text-slate-400'
                          }`}
                        >
                          {z}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleFetchGoogleMaps}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition"
                  >
                    Load Satellite Image into Swarm GCS
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Image Inspection Card with 600-Cell Target Integration */}
          {previewUrl && (
            <div className="p-4 bg-[#121a28] border border-[#29374d] rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Selected Scene: <span className="text-white font-bold">{imageName}</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => previewUrl && runDetectionOnUrl(previewUrl)}
                    disabled={analyzing || !previewUrl}
                    className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                    title="Scan image across 600-cell grid with Gemini Vision API"
                  >
                    {analyzing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : (
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>{analyzing ? 'Scanning 600 Cells...' : 'Scan with Gemini Vision AI'}</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>{detectedTargets.length} Objectives Mapped</span>
                  </div>
                </div>
              </div>

              {/* Gemini Vision API Scan Progress Banner */}
              {analyzing && (
                <div className="p-3 bg-cyan-950/40 border border-cyan-500/50 rounded-lg flex items-center gap-2.5 text-xs text-cyan-300 font-mono animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white">Gemini Vision AI Engine:</span> Analyzing discrete 600-cell coordinate grid (cols 0–29, rows 0–19, cells 0–599) for humans, vehicles, boats, and animals...
                  </div>
                </div>
              )}

              {/* Realistic Clean Photo Preview */}
              <div className="relative w-full h-52 rounded-lg overflow-hidden border border-[#29374d] bg-black">
                <img
                  src={previewUrl}
                  alt="Disaster Preview"
                  className="w-full h-full object-cover"
                />

                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/80 backdrop-blur text-[11px] font-mono text-slate-300 border border-white/20 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>600-Cell Discrete Grid Ready • Swarm Waypoints Syncing to Occupied Cells</span>
                </div>
              </div>

              {/* Detected Targets Breakdown across the 600-cell coordinate space */}
              {detectedTargets.length > 0 && (
                <div className="p-3 bg-[#0e1624] rounded-lg border border-[#222f42] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400">
                      Detected Entities ({detectedTargets.length} total across 600 cells):
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">
                        {detectedTargets.filter((t) => t.type === 'HUMAN').length} Humans [Cyan]
                      </span>
                      <span className="text-purple-400 font-bold">
                        {detectedTargets.filter((t) => t.type === 'VEHICLE').length} Vehicles [Purple]
                      </span>
                      {detectedTargets.some((t) => t.type === 'BOAT') && (
                        <span className="text-sky-400 font-bold">
                          {detectedTargets.filter((t) => t.type === 'BOAT').length} Boats [Blue]
                        </span>
                      )}
                      {detectedTargets.some((t) => t.type === 'ANIMAL') && (
                        <span className="text-rose-400 font-bold">
                          {detectedTargets.filter((t) => t.type === 'ANIMAL').length} Animals [Red]
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Discrete target chips with exact cell coordinates */}
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                    {detectedTargets.slice(0, 16).map((t) => {
                      const col = t.col !== undefined ? t.col : t.x;
                      const row = t.row !== undefined ? t.row : t.y;
                      const cell_id = t.cell_id !== undefined ? t.cell_id : row * 30 + col;
                      const conf = Math.round((t.confidence || 0.98) * 100);

                      const badgeColor =
                        t.type === 'HUMAN'
                          ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/30'
                          : t.type === 'VEHICLE'
                          ? 'border-purple-500/40 text-purple-300 bg-purple-950/30'
                          : t.type === 'BOAT'
                          ? 'border-sky-500/40 text-sky-300 bg-sky-950/30'
                          : 'border-rose-500/40 text-rose-300 bg-rose-950/30';

                      return (
                        <span
                          key={t.target_id}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${badgeColor}`}
                        >
                          <Crosshair className="w-2.5 h-2.5" />
                          <span className="font-bold">{t.type} [{conf}%]</span>
                          <span className="opacity-70">cell #{cell_id} ({col},{row})</span>
                        </span>
                      );
                    })}
                    {detectedTargets.length > 16 && (
                      <span className="text-[10px] font-mono text-slate-400 self-center">
                        +{detectedTargets.length - 16} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Objectives details note */}
              <div className="p-3 bg-[#0e1624] rounded-lg border border-[#222f42] text-xs text-slate-400 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-300">Swarm Pathfinding Waypoint Ingestion:</span> Drone swarm zones Z1–Z5 will route directly to each detected cell coordinate ({detectedTargets.length} waypoints prioritized). Targets are revealed with corner brackets and class badges as drones survey each occupied cell.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#141d2e] border-t border-[#29374d] flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Zones Z1–Z5 • Lawnmower Coverage with A* Obstacle Avoidance
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#222c3e] hover:bg-[#2b394e] text-slate-300 font-semibold text-xs rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!previewUrl || analyzing}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow transition"
            >
              Deploy Scene to Swarm Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
