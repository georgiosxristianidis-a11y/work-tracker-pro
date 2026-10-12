import React from 'react';
import { X, ShieldAlert, ShieldCheck, Download, RotateCcw, Trash2, Eye, EyeOff, ClipboardList } from 'lucide-react';
import { useFinancialDashboardStore } from '../../store/useFinancialDashboardStore';
import { OfflineVault } from '../../lib/offline-vault';

export function SecurityControlsModal() {
  const {
    activeModal,
    setActiveModal,
    isPrivacyMasked,
    togglePrivacyMask,
    resetToBaseline,
    panicWipeData
  } = useFinancialDashboardStore();

  const [confirmPanic, setConfirmPanic] = React.useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = React.useState<string | null>(null);

  if (activeModal !== 'security') return null;

  const handleExportBackup = async () => {
    try {
      const state = useFinancialDashboardStore.getState();
      const backupStr = await OfflineVault.exportBackupString(state);
      const blob = new Blob([backupStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial_vault_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedbackMsg('Encrypted backup exported securely.');
    } catch {
      setFeedbackMsg('Backup export failed.');
    }
  };

  const handleResetBaseline = () => {
    resetToBaseline();
    setFeedbackMsg('Reset to baseline reference successfully ($11,121.22).');
  };

  const handlePanicWipe = async () => {
    if (!confirmPanic) {
      setConfirmPanic(true);
      return;
    }
    await panicWipeData();
    setActiveModal(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 bg-[#F8FAFC] rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Security & Privacy Vault</h3>
              <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                100% Offline • Zero Network Traffic
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedbackMsg && (
          <div className="p-2.5 mb-4 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl">
            {feedbackMsg}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Privacy Mask Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div>
              <div className="text-xs font-bold text-slate-800">Privacy Shield (Mask Balances)</div>
              <div className="text-[11px] text-slate-400">Blurs sensitive numbers on the dashboard</div>
            </div>
            <button
              type="button"
              onClick={togglePrivacyMask}
              className={`p-2 rounded-xl transition-all ${
                isPrivacyMasked ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isPrivacyMasked ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Export Encrypted Backup */}
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 rounded-2xl shadow-sm border border-slate-100 text-left transition-all active:scale-[0.99]"
          >
            <div>
              <div className="text-xs font-bold text-slate-800">Export Encrypted Backup</div>
              <div className="text-[11px] text-slate-400">Save AES-GCM encrypted state JSON locally</div>
            </div>
            <Download className="w-4 h-4 text-slate-500" />
          </button>

          {/* Reset to Baseline Reference */}
          <button
            type="button"
            onClick={handleResetBaseline}
            className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 rounded-2xl shadow-sm border border-slate-100 text-left transition-all active:scale-[0.99]"
          >
            <div>
              <div className="text-xs font-bold text-slate-800">Reset to Baseline Reference</div>
              <div className="text-[11px] text-slate-400">Restore exact $11,121.22 reference numbers</div>
            </div>
            <RotateCcw className="w-4 h-4 text-slate-500" />
          </button>

          {/* Panic Wipe (Danger Zone) */}
          <div className="p-3.5 mt-2 bg-rose-50/70 border border-rose-100 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                <ShieldAlert className="w-4 h-4" />
                <span>Panic Button (Clean Slate)</span>
              </div>
            </div>
            <p className="text-[10.5px] text-rose-600/90 mb-3">
              Instantly wipes the local IndexedDB database, caches, and memory session keys.
            </p>
            <button
              type="button"
              onClick={handlePanicWipe}
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                confirmPanic
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-100/50'
              }`}
            >
              {confirmPanic ? 'Confirm Wipe All Data Now' : 'Panic Wipe All Local Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
