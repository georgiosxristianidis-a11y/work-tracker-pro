import React from 'react';
import { X, ArrowUpRight, ArrowDownRight, PlusCircle, ArrowLeftRight } from 'lucide-react';
import { useFinancialDashboardStore } from '../../store/useFinancialDashboardStore';
import { CurrencyMath } from '../../lib/currency-math';

export function FinancialActionModal() {
  const {
    activeModal,
    setActiveModal,
    cryptoAssets,
    executeTransaction,
    overallBalanceScaled
  } = useFinancialDashboardStore();

  const [selectedAssetId, setSelectedAssetId] = React.useState<string>(cryptoAssets[0]?.id || 'btc');
  const [amountInput, setAmountInput] = React.useState<string>('150.00');
  const [counterparty, setCounterparty] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (!activeModal || activeModal === 'security' || activeModal === 'paste' || activeModal === 'import') return null;

  const title = {
    send: 'Send Funds',
    receive: 'Receive Funds',
    top_up: 'Top Up Balance',
    transfer: 'Transfer Assets'
  }[activeModal];

  const icon = {
    send: <ArrowUpRight className="w-5 h-5 text-amber-500" />,
    receive: <ArrowDownRight className="w-5 h-5 text-emerald-500" />,
    top_up: <PlusCircle className="w-5 h-5 text-indigo-500" />,
    transfer: <ArrowLeftRight className="w-5 h-5 text-cyan-500" />
  }[activeModal];

  const currentAsset = cryptoAssets.find(a => a.id === selectedAssetId) || cryptoAssets[0];

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid positive amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await executeTransaction(activeModal, parsedAmount, selectedAssetId, counterparty);
      if (!success) {
        setErrorMessage('Transaction rejected: Insufficient funds in selected asset.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md p-6 bg-[#F8FAFC] rounded-[28px] 
          shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-white"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white rounded-xl shadow-sm">
              {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-2.5 mb-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            {errorMessage}
          </div>
        )}

        {/* Transaction Form */}
        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          {/* Target Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Select Category / Project
            </label>
            <div className="grid grid-cols-4 gap-2">
              {cryptoAssets.map(asset => {
                const isSelected = asset.id === selectedAssetId;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white text-slate-700 hover:bg-slate-100 shadow-sm'
                    }`}
                  >
                    <span className="text-xs font-bold">{asset.symbol}</span>
                    <span className="text-[9.5px] opacity-75 truncate max-w-full text-center">{asset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Amount ($)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                required
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-inner"
              />
            </div>
          </div>

          {/* Counterparty / Note Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              {activeModal === 'send' ? 'Destination / Milestone' : 'Source / Milestone Ref'}
            </label>
            <input
              type="text"
              placeholder={activeModal === 'send' ? 'e.g. Milestone Release' : 'e.g. Client Payment Deposit'}
              value={counterparty}
              onChange={e => setCounterparty(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {/* Real-time Math Summary */}
          <div className="p-3 bg-slate-100/80 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between text-slate-500">
              <span>Category Balance:</span>
              <span className="font-semibold text-slate-800">
                {currentAsset ? CurrencyMath.format(BigInt(currentAsset.balanceScaled), '$', 2) : '$0.00'}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Engine Precision:</span>
              <span className="font-mono text-emerald-600 font-semibold">BigInt Fixed-Point (0.0000)</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-2 rounded-xl bg-slate-900 text-white font-bold text-sm 
              shadow-md hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Calculating...' : `Execute ${title}`}
          </button>
        </form>
      </div>
    </div>
  );
}
