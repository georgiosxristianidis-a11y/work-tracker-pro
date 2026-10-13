import React from 'react';
import { X, UploadCloud, Calendar, Sparkles, Check, AlertCircle, FileText, Camera, ArrowRight, ShieldCheck } from 'lucide-react';
import { useFinancialDashboardStore } from '../../store/useFinancialDashboardStore';
import { SmartDocumentParser, ParseResult } from '../../lib/smart-document-parser';
import { HistoricalGenerator, HistoricalSummary, WorkProfile } from '../../lib/historical-generator';

export function SmartImportModal() {
  const { activeModal, setActiveModal, syncWithWorkTrackerHistory } = useFinancialDashboardStore();
  const [tab, setTab] = React.useState<'document' | 'multi_year'>('document');
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);
  const [feedback, setFeedback] = React.useState<{ text: string; isError: boolean } | null>(null);

  // Document upload state
  const [parseResult, setParseResult] = React.useState<ParseResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);

  // Multi-year generator state
  const [selectedYears, setSelectedYears] = React.useState<3 | 5>(3);
  const [profile, setProfile] = React.useState<WorkProfile>('balanced');
  const [rate, setRate] = React.useState<number>(25);

  const previewHistory = React.useMemo<HistoricalSummary>(() => {
    return HistoricalGenerator.generateHistory(selectedYears, rate, profile);
  }, [selectedYears, rate, profile]);

  if (activeModal !== 'import') return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFeedback(null);
    try {
      const res = await SmartDocumentParser.parseFile(file);
      setParseResult(res);
      if (res.records.length === 0) {
        setFeedback({
          text: `Parsed ${res.detectedFormat.toUpperCase()}, but no valid records found. Try plain text or check format.`,
          isError: true
        });
      } else {
        setFeedback({
          text: `Found ${res.records.length} records (${res.totalHours}h) in ${file.name}. Review below.`,
          isError: false
        });
      }
    } catch (err: any) {
      setFeedback({ text: `Upload failed: ${err?.message || 'Unknown error'}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDocSync = async () => {
    if (!parseResult || parseResult.records.length === 0) return;

    setIsProcessing(true);
    try {
      const entries = parseResult.records.map(r => ({
        date: r.date,
        hours: r.hours,
        month: r.month
      }));
      const res = await syncWithWorkTrackerHistory(entries, rate);
      if (res.success) {
        setFeedback({ text: res.message, isError: false });
        setTimeout(() => setActiveModal(null), 900);
      } else {
        setFeedback({ text: res.message, isError: true });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmMultiYearSync = async () => {
    setIsProcessing(true);
    try {
      const res = await syncWithWorkTrackerHistory(previewHistory.entries, rate);
      if (res.success) {
        setFeedback({ text: res.message, isError: false });
        setTimeout(() => setActiveModal(null), 900);
      } else {
        setFeedback({ text: res.message, isError: true });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 bg-[#F8FAFC] rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Smart Import & Multi-Year Sync</h3>
              <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 inline" />
                100% Offline • Zero Network Traffic
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Tab Bar */}
        <div className="flex items-center p-1 mb-4 bg-slate-200/70 rounded-2xl">
          <button
            type="button"
            onClick={() => { setTab('document'); setFeedback(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'document' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Import Document (PDF / DOCX / MD / JSON)
          </button>
          <button
            type="button"
            onClick={() => { setTab('multi_year'); setFeedback(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'multi_year' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            3–5 Year Smart Fill
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`flex items-center gap-2 p-3 mb-4 text-xs font-semibold rounded-xl border ${
            feedback.isError 
              ? 'text-rose-700 bg-rose-50 border-rose-200' 
              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}>
            {feedback.isError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* TAB 1: Document Upload */}
        {tab === 'document' && (
          <div className="space-y-4">
            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.md,.markdown,.txt,.csv,.json,image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Dropzone Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer flex flex-col items-center justify-center p-6 border-2 border-dashed 
                border-slate-300 hover:border-indigo-400 bg-white rounded-2xl transition-all text-center hover:bg-slate-50/50"
            >
              <div className="p-3 mb-2 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-105 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                Click to browse or drop document
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                PDF, DOCX, Markdown, Plain Text, or JSON
              </p>

              {/* Supported Pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
                {['.PDF', '.DOCX', '.MD', '.TXT', '.JSON'].map(fmt => (
                  <span key={fmt} className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md">
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            {/* Camera Scan Fallback Pill */}
            <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Camera className="w-4 h-4 text-indigo-500" />
                <span>Mobile Scan / Live-Text Photo</span>
              </div>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
              >
                Scan Receipt / QR
              </button>
            </div>

            {/* Parse Result Preview */}
            {parseResult && parseResult.records.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span>Parsed {parseResult.records.length} records</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {parseResult.startDate} → {parseResult.endDate}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-medium">Total Work Hours</span>
                    <span className="text-sm font-extrabold text-slate-800">{parseResult.totalHours} hrs</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 block font-medium">Est. Value (@${rate}/h)</span>
                    <span className="text-sm font-extrabold text-emerald-600">
                      ${(parseResult.totalHours * rate).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Sample rows */}
                <div className="max-h-32 overflow-y-auto text-[11px] font-mono divide-y divide-slate-100 border border-slate-100 rounded-xl">
                  {parseResult.records.slice(0, 10).map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-white">
                      <span className="text-slate-600">{r.date}</span>
                      <span className="font-bold text-slate-800">{r.hours}h</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 uppercase">
                        {r.category || 'core'}
                      </span>
                    </div>
                  ))}
                  {parseResult.records.length > 10 && (
                    <div className="px-2.5 py-1 text-[10px] text-center text-slate-400 bg-slate-50 font-sans">
                      ...and {parseResult.records.length - 10} more records
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConfirmDocSync}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
                >
                  <span>Sync Parsed Records to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 3-5 Year Smart Fill */}
        {tab === 'multi_year' && (
          <div className="space-y-4">
            {/* Year Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Historical Horizon:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedYears(3)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedYears === 3 
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500' 
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-extrabold text-slate-800">3 Years</div>
                  <div className="text-[11px] text-slate-500">2023 – 2026 (~750 work days)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedYears(5)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    selectedYears === 5 
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500' 
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-extrabold text-slate-800">5 Years</div>
                  <div className="text-[11px] text-slate-500">2021 – 2026 (~1,250 work days)</div>
                </button>
              </div>
            </div>

            {/* Profile Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Work Pattern Profile:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['balanced', 'freelance', 'intensive'] as WorkProfile[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProfile(p)}
                    className={`py-2 px-3 rounded-xl border text-center capitalize font-semibold transition-all ${
                      profile === p 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Hourly Rate Input */}
            <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Hourly Rate Applied:</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min={5}
                  max={500}
                  value={rate}
                  onChange={e => setRate(Math.max(1, parseInt(e.target.value, 10) || 25))}
                  className="w-16 p-1 text-xs font-bold text-right border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">/h</span>
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>{previewHistory.entries.length} Generated Entries</span>
                </span>
                <span className="text-xs font-extrabold text-emerald-600">
                  ${previewHistory.totalEarned.toLocaleString()} Total
                </span>
              </div>

              {/* Annual Breakdown */}
              <div className="flex flex-wrap gap-1.5">
                {previewHistory.yearlyBreakdown.map(y => (
                  <div key={y.year} className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                    <span className="font-bold text-slate-800">{y.year}: </span>
                    <span className="text-slate-500">{y.hours}h</span>
                    <span className="font-semibold text-emerald-600 ml-1">${y.earned.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Category Breakdown (40/30/20/10) */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Core Projects (40%):</span>
                  <span className="font-bold text-slate-800">${(previewHistory.totalEarned * 0.4).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Direct Clients (30%):</span>
                  <span className="font-bold text-slate-800">${(previewHistory.totalEarned * 0.3).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Retainer (20%):</span>
                  <span className="font-bold text-slate-800">${(previewHistory.totalEarned * 0.2).toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Consulting (10%):</span>
                  <span className="font-bold text-slate-800">${(previewHistory.totalEarned * 0.1).toFixed(0)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmMultiYearSync}
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 active:scale-[0.99] shadow-sm"
              >
                <span>Generate & Sync {selectedYears} Years to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
