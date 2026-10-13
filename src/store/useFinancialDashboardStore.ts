import { create } from 'zustand';
import { CurrencyMath } from '../lib/currency-math';
import { OfflineVault } from '../lib/offline-vault';
import { db } from '../lib/db';

export interface CryptoAssetItem {
  id: string;
  name: string;
  symbol: string;
  balanceScaled: string; // BigInt stored as string for persistence
  iconType: 'core' | 'clients' | 'retainer' | 'consulting' | 'btc' | 'eth' | 'dash' | 'edo';
  color: string;
}

export interface BenefitDataPoint {
  month: string;
  value: number; // e.g. 0 to 8 scale
}

export interface FinancialTransaction {
  id: string;
  type: 'send' | 'receive' | 'top_up' | 'transfer';
  assetId: string;
  amountScaled: string;
  timestamp: number;
  recipientOrSender?: string;
}

export interface FinancialDashboardState {
  // Baseline balances (as string-serialized BigInts to ensure lossless serializability)
  overallBalanceScaled: string;
  profitScaled: string;
  profitGrowthPct: number;
  sharesScaled: string;
  sharesGrowthPct: number;
  capabilitiesTotalScaled: string;
  netGrowthPct: number;

  // Breakdown percentages (Fixed Rate, Hourly Work, Direct Projects)
  nftPercent: number;
  stocksPercent: number;
  cryptoPercent: number;

  // Assets / Work categories
  cryptoAssets: CryptoAssetItem[];

  // Benefits curve
  benefitsData: BenefitDataPoint[];
  selectedPeriod: string;

  // User
  userName: string;
  userAvatar: string;

  // Security & UX
  isPrivacyMasked: boolean;
  isVaultLocked: boolean;
  activeModal: 'send' | 'receive' | 'top_up' | 'transfer' | 'security' | 'paste' | 'import' | null;
  transactions: FinancialTransaction[];

  // Actions
  togglePrivacyMask: () => void;
  setActiveModal: (modal: 'send' | 'receive' | 'top_up' | 'transfer' | 'security' | 'paste' | 'import' | null) => void;
  setSelectedPeriod: (period: string) => void;
  executeTransaction: (
    type: 'send' | 'receive' | 'top_up' | 'transfer',
    amount: number,
    assetId: string,
    counterparty?: string
  ) => Promise<boolean>;
  applyRawDataInput: (input: string) => Promise<{ success: boolean; message: string }>;
  syncWithWorkTrackerHistory: (
    entries: { date: string; hours: number; month: string }[],
    hourlyRate?: number
  ) => Promise<{ success: boolean; message: string }>;
  resetToBaseline: () => void;
  panicWipeData: () => Promise<void>;
  saveToVault: () => Promise<void>;
  loadFromVault: () => Promise<void>;
}

// Exact reference values adapted to Work Tracker income categories
const BASELINE_DATA = {
  overallBalanceScaled: CurrencyMath.toScaled(11121.22).toString(),
  profitScaled: CurrencyMath.toScaled(4737.99).toString(),
  profitGrowthPct: 12.3,
  sharesScaled: CurrencyMath.toScaled(2556.80).toString(),
  sharesGrowthPct: 8.5,
  capabilitiesTotalScaled: CurrencyMath.toScaled(1776.00).toString(),
  netGrowthPct: 42,
  nftPercent: 17, // Fixed Rate Contracts
  stocksPercent: 25, // Hourly Work
  cryptoPercent: 58, // Direct Projects
  cryptoAssets: [
    {
      id: 'core',
      name: 'Core Projects',
      symbol: 'CORE',
      balanceScaled: CurrencyMath.toScaled(2467.30).toString(),
      iconType: 'core' as const,
      color: '#E5A83B'
    },
    {
      id: 'clients',
      name: 'Direct Clients',
      symbol: 'CLIENTS',
      balanceScaled: CurrencyMath.toScaled(1990.01).toString(),
      iconType: 'clients' as const,
      color: '#6366F1'
    },
    {
      id: 'retainer',
      name: 'Retainer',
      symbol: 'RETAINER',
      balanceScaled: CurrencyMath.toScaled(1455.10).toString(),
      iconType: 'retainer' as const,
      color: '#0EA5E9'
    },
    {
      id: 'consulting',
      name: 'Consulting',
      symbol: 'ADVISORY',
      balanceScaled: CurrencyMath.toScaled(988.07).toString(),
      iconType: 'consulting' as const,
      color: '#10B981'
    }
  ],
  benefitsData: [
    { month: 'JUN', value: 2.1 },
    { month: 'JUL', value: 3.4 },
    { month: 'AUG', value: 2.8 },
    { month: 'SEP', value: 6.2 },
    { month: 'OCT', value: 4.0 },
    { month: 'NOV', value: 4.8 },
    { month: 'DEC', value: 6.9 }
  ],
  selectedPeriod: 'June - December',
  userName: 'Ruben Torff',
  userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  isPrivacyMasked: false,
  isVaultLocked: false,
  activeModal: null,
  transactions: []
};

const VAULT_STORAGE_KEY = 'dashboard_state_v1';

export const useFinancialDashboardStore = create<FinancialDashboardState>((set, get) => ({
  ...BASELINE_DATA,

  togglePrivacyMask: () => {
    set(state => ({ isPrivacyMasked: !state.isPrivacyMasked }));
  },

  setActiveModal: (modal) => {
    set({ activeModal: modal });
  },

  setSelectedPeriod: (period) => {
    set({ selectedPeriod: period });
  },

  resetToBaseline: () => {
    set({ ...BASELINE_DATA });
    get().saveToVault().catch(console.error);
  },

  executeTransaction: async (type, amount, assetId, counterparty) => {
    if (amount <= 0) return false;

    const amountScaled = CurrencyMath.toScaled(amount);
    const state = get();
    const currentOverall = BigInt(state.overallBalanceScaled);

    const targetAsset = state.cryptoAssets.find(a => a.id === assetId);
    if (!targetAsset) return false;
    const currentAssetBal = BigInt(targetAsset.balanceScaled);

    // Insufficient Funds Guard: prevent phantom deficits
    if (type === 'send') {
      if (currentAssetBal < amountScaled) {
        return false;
      }
    }

    const nextAssets = state.cryptoAssets.map(asset => {
      if (asset.id !== assetId) return asset;
      const nextBal = type === 'send'
        ? CurrencyMath.sub(currentAssetBal, amountScaled)
        : CurrencyMath.add(currentAssetBal, amountScaled);

      return {
        ...asset,
        balanceScaled: nextBal.toString()
      };
    });

    const nextOverall = type === 'send'
      ? CurrencyMath.sub(currentOverall, amountScaled)
      : CurrencyMath.add(currentOverall, amountScaled);

    // Exact re-calculation of asset class breakdown via Largest Remainder Method
    const cryptoTotalScaled = nextAssets.reduce(
      (sum, item) => sum + BigInt(item.balanceScaled),
      0n
    );
    const sharesScaled = BigInt(state.sharesScaled);
    // Approximate remaining as NFT allocation
    const baseNftScaled = CurrencyMath.toScaled(500); // stable baseline pool

    const proportions = CurrencyMath.calculatePercentages([
      baseNftScaled,
      sharesScaled,
      cryptoTotalScaled
    ]);

    const nextNftPct = proportions[0];
    const nextStocksPct = proportions[1];
    const nextCryptoPct = proportions[2];

    const newTx: FinancialTransaction = {
      id: crypto.randomUUID(),
      type,
      assetId,
      amountScaled: amountScaled.toString(),
      timestamp: Date.now(),
      recipientOrSender: counterparty
    };

    // Update the last month in benefits chart dynamically
    const nextBenefits = [...state.benefitsData];
    const lastIdx = nextBenefits.length - 1;
    if (lastIdx >= 0) {
      const delta = type === 'send' ? -0.4 : 0.4;
      const clamped = Math.max(1, Math.min(8, nextBenefits[lastIdx].value + delta));
      nextBenefits[lastIdx] = {
        ...nextBenefits[lastIdx],
        value: Number(clamped.toFixed(1))
      };
    }

    set({
      overallBalanceScaled: nextOverall.toString(),
      cryptoAssets: nextAssets,
      nftPercent: nextNftPct,
      stocksPercent: nextStocksPct,
      cryptoPercent: nextCryptoPct,
      benefitsData: nextBenefits,
      transactions: [newTx, ...state.transactions],
      activeModal: null
    });

    await get().saveToVault();
    return true;
  },

  applyRawDataInput: async (rawText: string) => {
    const text = rawText.trim();
    if (!text) return { success: false, message: 'Input is empty.' };

    const state = get();

    // 1. Check if input is valid JSON snapshot
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          set(prev => ({
            ...prev,
            ...parsed,
            activeModal: null
          }));
          await get().saveToVault();
          return { success: true, message: 'JSON state imported successfully.' };
        }
      } catch {
        // Fallback to text parsing
      }
    }

    // 2. Intelligent raw text & number extraction
    const numberMatches = text.match(/[-+]?\$?\d[\d,]*(?:\.\d+)?(?:e[-+]?\d+)?/gi);
    if (!numberMatches || numberMatches.length === 0) {
      return { success: false, message: 'No valid numeric values found in text.' };
    }

    const parsedNumbers = numberMatches
      .map(m => m.replace(/[\$,]/g, '').trim())
      .filter(m => !isNaN(parseFloat(m)))
      .map(m => parseFloat(m));

    if (parsedNumbers.length === 0) {
      return { success: false, message: 'Could not parse numbers.' };
    }

    // Assign to category balances
    const nextAssets = [...state.cryptoAssets];
    for (let i = 0; i < Math.min(parsedNumbers.length, nextAssets.length); i++) {
      const val = Math.max(0, parsedNumbers[i]);
      nextAssets[i] = {
        ...nextAssets[i],
        balanceScaled: CurrencyMath.toScaled(val).toString()
      };
    }

    // If more numbers provided, assign to benefits curve
    let nextBenefits = [...state.benefitsData];
    if (parsedNumbers.length > nextAssets.length) {
      const benefitValues = parsedNumbers.slice(nextAssets.length);
      nextBenefits = nextBenefits.map((b, idx) => {
        if (idx < benefitValues.length) {
          return { ...b, value: Math.max(0.1, Number(benefitValues[idx].toFixed(1))) };
        }
        return b;
      });
    }

    // Invariant recalculation
    const totalCategoriesScaled = nextAssets.reduce(
      (sum, item) => sum + BigInt(item.balanceScaled),
      0n
    );
    const sharesScaled = BigInt(state.sharesScaled);
    const baseFixedScaled = CurrencyMath.toScaled(500);
    const nextOverallScaled = totalCategoriesScaled + sharesScaled + baseFixedScaled;

    // Largest remainder percentages
    const percentages = CurrencyMath.calculatePercentages([
      baseFixedScaled,
      sharesScaled,
      totalCategoriesScaled
    ]);

    set({
      cryptoAssets: nextAssets,
      benefitsData: nextBenefits,
      overallBalanceScaled: nextOverallScaled.toString(),
      nftPercent: percentages[0],
      stocksPercent: percentages[1],
      cryptoPercent: percentages[2],
      activeModal: null
    });

    await get().saveToVault();
    return { success: true, message: `Applied ${parsedNumbers.length} values with exact offline math.` };
  },

  syncWithWorkTrackerHistory: async (
    entries: { date: string; hours: number; month: string }[],
    hourlyRate = 25
  ) => {
    if (!entries || entries.length === 0) {
      return { success: false, message: 'No entries to synchronize.' };
    }

    try {
      // 1. Batch save all entries into IndexedDB WorkDB
      await db.init();
      await db.saveMany(entries);

      // 2. Exact BigInt earnings calculation
      const totalHours = entries.reduce((acc, e) => acc + e.hours, 0);
      const totalEarned = totalHours * hourlyRate;
      const totalEarnedScaled = CurrencyMath.toScaled(totalEarned);

      // 3. Exact 4-category allocation:
      // Core (40%), Clients (30%), Retainer (20%), Consulting (10%)
      const coreScaled = (totalEarnedScaled * 40n) / 100n;
      const clientsScaled = (totalEarnedScaled * 30n) / 100n;
      const retainerScaled = (totalEarnedScaled * 20n) / 100n;
      const consultingScaled = totalEarnedScaled - (coreScaled + clientsScaled + retainerScaled);

      const state = get();
      const nextAssets = state.cryptoAssets.map(asset => {
        if (asset.id === 'core') return { ...asset, balanceScaled: coreScaled.toString() };
        if (asset.id === 'clients') return { ...asset, balanceScaled: clientsScaled.toString() };
        if (asset.id === 'retainer') return { ...asset, balanceScaled: retainerScaled.toString() };
        if (asset.id === 'consulting') return { ...asset, balanceScaled: consultingScaled.toString() };
        return asset;
      });

      // 4. Monthly aggregation for Benefits curve (most recent 7-12 months)
      const monthlyHoursMap = new Map<string, number>();
      for (const entry of entries) {
        monthlyHoursMap.set(entry.month, (monthlyHoursMap.get(entry.month) || 0) + entry.hours);
      }

      const sortedMonths = Array.from(monthlyHoursMap.keys()).sort();
      const recentMonths = sortedMonths.slice(-7);
      const nextBenefits: BenefitDataPoint[] = recentMonths.map(m => {
        const hrs = monthlyHoursMap.get(m) || 0;
        const earnedK = (hrs * hourlyRate) / 1000;
        const parts = m.split('-');
        const monthNum = parseInt(parts[1] || '1', 10);
        const monthNames = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
        const label = monthNames[monthNum % 12] || m;
        return {
          month: label,
          value: Math.max(0.5, Math.round(earnedK * 10) / 10)
        };
      });

      // 5. Overall Balance recalculation with exact invariant
      const totalCategoriesScaled = coreScaled + clientsScaled + retainerScaled + consultingScaled;
      const sharesScaled = BigInt(state.sharesScaled);
      const baseFixedScaled = CurrencyMath.toScaled(500);
      const nextOverallScaled = totalCategoriesScaled + sharesScaled + baseFixedScaled;

      // 6. Hare-Niemeyer percentage breakdown
      const percentages = CurrencyMath.calculatePercentages([
        baseFixedScaled,
        sharesScaled,
        totalCategoriesScaled
      ]);

      set({
        cryptoAssets: nextAssets,
        benefitsData: nextBenefits.length >= 2 ? nextBenefits : state.benefitsData,
        overallBalanceScaled: nextOverallScaled.toString(),
        nftPercent: percentages[0],
        stocksPercent: percentages[1],
        cryptoPercent: percentages[2],
        activeModal: null
      });

      await get().saveToVault();

      return {
        success: true,
        message: `Synchronized ${entries.length} records (${Math.round(totalHours)}h, $${CurrencyMath.format(totalEarnedScaled, '')}).`
      };
    } catch (err: any) {
      return { success: false, message: `Sync failed: ${err?.message || 'Unknown error'}` };
    }
  },

  saveToVault: async () => {
    try {
      const state = get();
      const persistent = {
        overallBalanceScaled: state.overallBalanceScaled,
        profitScaled: state.profitScaled,
        profitGrowthPct: state.profitGrowthPct,
        sharesScaled: state.sharesScaled,
        sharesGrowthPct: state.sharesGrowthPct,
        capabilitiesTotalScaled: state.capabilitiesTotalScaled,
        netGrowthPct: state.netGrowthPct,
        nftPercent: state.nftPercent,
        stocksPercent: state.stocksPercent,
        cryptoPercent: state.cryptoPercent,
        cryptoAssets: state.cryptoAssets,
        benefitsData: state.benefitsData,
        transactions: state.transactions
      };
      await OfflineVault.saveState(VAULT_STORAGE_KEY, persistent);
    } catch (err) {
      console.warn('Vault save non-critical warning:', err);
    }
  },

  loadFromVault: async () => {
    try {
      const saved = await OfflineVault.loadState<Partial<FinancialDashboardState>>(VAULT_STORAGE_KEY);
      if (saved) {
        set(state => ({
          ...state,
          ...saved
        }));
      }
    } catch (err) {
      console.warn('Vault load warning:', err);
    }
  },

  panicWipeData: async () => {
    await OfflineVault.panicWipeAll();
    set({
      ...BASELINE_DATA,
      overallBalanceScaled: '0',
      cryptoAssets: BASELINE_DATA.cryptoAssets.map(a => ({ ...a, balanceScaled: '0' })),
      transactions: []
    });
  }
}));
