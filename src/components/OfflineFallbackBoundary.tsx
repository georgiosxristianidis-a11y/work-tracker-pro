import React, { Component, ErrorInfo, ReactNode } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
  retryText?: string;
}

interface State {
  hasError: boolean;
}

export class OfflineFallbackBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[OfflineFallback] Caught lazy chunk error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[340px] p-6 text-center bg-[var(--bg-1)] border border-[var(--b)] rounded-[1.75rem] shadow-sm my-4 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--b)] text-[var(--t2)] flex items-center justify-center">
            <WifiOff size={26} strokeWidth={1.75} />
          </div>
          <div className="space-y-1.5 max-w-xs">
            <h3 className="text-base font-black text-[var(--t1)] uppercase tracking-wide">
              {this.props.title || 'Offline Content'}
            </h3>
            <p className="text-xs font-semibold text-[var(--t3)] leading-relaxed">
              {this.props.description || 'This section requires an initial internet connection to download offline assets.'}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="py-2.5 px-5 rounded-xl bg-[var(--t1)] text-[var(--bg)] text-xs font-black uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-sm"
          >
            <RefreshCw size={14} />
            <span>{this.props.retryText || 'Try Again'}</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
