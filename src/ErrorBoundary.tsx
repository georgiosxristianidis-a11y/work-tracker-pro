import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
          <div className="bg-[var(--bg-1)] p-8 rounded-[32px] border border-[var(--b)] max-w-sm w-full shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-[var(--danger)]/10 text-[var(--danger)] rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <h1 className="text-xl font-black text-[var(--t1)] uppercase tracking-widest mb-2">Something went wrong</h1>
            <p className="text-sm font-bold text-[var(--t3)] mb-8">
              We encountered an unexpected error. Please restart the app or reset your data if the issue persists.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => window.location.reload()}
                className="w-full h-14 rounded-[16px] bg-[var(--a)] text-[var(--bg)] font-black uppercase tracking-widest text-xs flex items-center justify-center active:scale-95 transition-all"
              >
                Restart App
              </button>
              <button 
                onClick={async () => {
                  if (confirm('This will wipe all local data. Are you sure?')) {
                    // Keep the Supabase session keys: the anonymous uid is the only
                    // link to the user's cloud backup — wiping it orphans those rows.
                    const preserved = Object.entries(localStorage).filter(([k]) => k.startsWith('sb-'));
                    localStorage.clear();
                    preserved.forEach(([k, v]) => localStorage.setItem(k, v));
                    const req = indexedDB.deleteDatabase('WorkTrackerProDB');
                    req.onsuccess = () => window.location.reload();
                    req.onerror = () => window.location.reload();
                  }
                }}
                className="w-full h-14 rounded-[16px] bg-transparent text-[var(--danger)] border border-[var(--danger)]/20 font-black uppercase tracking-widest text-xs flex items-center justify-center active:scale-95 transition-all"
              >
                Reset App Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 
