import React from 'react';
import { X, Clipboard, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useFinancialDashboardStore } from '../../store/useFinancialDashboardStore';

export function QuickDataPasteModal() {
  const { activeModal, setActiveModal, applyRawDataInput } = useFinancialDashboardStore();
  const [inputText, setInputText] = React.useState<string>('');
  const [feedback, setFeedback] = React.useState<{ text: string; isError: boolean } | null>(null);
  const [isApplying, setIsApplying] = React.useState<boolean>(false);

  if (activeModal !== 'paste') return null;

  const handleApply = async () => {
    if (!inputText.trim()) {
      setFeedback({ text: 'Please paste or type numbers first.', isError: true });
      return;
    }

    setIsApplying(true);
    try {
      const res = await applyRawDataInput(inputText);
      if (res.success) {
        setFeedback({ text: res.message, isError: false });
        setTimeout(() => {
          setActiveModal(null);
        }, 800);
      } else {
        setFeedback({ text: res.message, isError: true });
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleClipboardPaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputText(text);
          setFeedback(null);
        }
      }
    } catch {
      // Graceful fallback for airplane mode or permissions denied
      setFeedback({ text: 'Clipboard access blocked. Use standard Ctrl+V / Cmd+V in the box below.', isError: false });
    }
  };

  const setExample = (sample: string) => {
    setInputText(sample);
    setFeedback(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 bg-[#F8FAFC] rounded-[30px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
              <Clipboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Quick Data Paste</h3>
              <p className="text-[11px] font-medium text-slate-400">
                100% Offline • Recalculates all balances, charts & proportions
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

        {/* Feedback Alert */}
        {feedback && (
          <div className={`flex items-center gap-2 p-3 mb-3 text-xs font-semibold rounded-xl border ${
            feedback.isError 
              ? 'text-rose-700 bg-rose-50 border-rose-200' 
              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}>
            {feedback.isError ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Format Help Pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5 text-[10.5px]">
          <span className="font-semibold text-slate-400">Templates:</span>
          <button
            type="button"
            onClick={() => setExample('Core: 3200, Clients: 2400, Retainer: 1800, Consulting: 1100')}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
          >
            Named Categories
          </button>
          <button
            type="button"
            onClick={() => setExample('3500, 2800, 1950, 1200, 3.2, 4.5, 5.8, 6.2, 4.0, 5.1, 7.5')}
            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
          >
            Categories + Benefits Curve
          </button>
        </div>

        {/* Input Textarea with Native Keyboard Paste */}
        <div className="relative mb-4">
          <textarea
            autoFocus
            rows={5}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Paste raw figures, CSV, or text (e.g. 2467, 1990, 1455, 988)..."
            className="w-full p-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 text-xs font-mono 
              focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-inner resize-none leading-relaxed"
          />

          <button
            type="button"
            onClick={handleClipboardPaste}
            className="absolute right-2.5 bottom-2.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 
              text-slate-600 text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Paste Clipboard</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying || !inputText.trim()}
            className="flex-[2] py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs 
              hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isApplying ? 'Calculating...' : 'Apply & Recalculate Offline'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
