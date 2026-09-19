'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[BlackPalate ErrorBoundary] Caught error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            backgroundColor: '#121212',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '32px 24px',
            textAlign: 'center',
            maxWidth: '560px',
            margin: '40px auto',
            color: '#F5F5F4',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: '#EF4444',
            }}
          >
            <AlertCircle size={24} />
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#F5F5F4' }}>
            {this.props.fallbackTitle || "We couldn't load this section"}
          </h3>

          <p style={{ fontSize: '14px', color: '#A8A29E', margin: '0 0 24px 0', lineHeight: 1.6 }}>
            {this.props.fallbackMessage ||
              'A temporary display issue occurred. Your progress and drafts are safe.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#F59E0B',
                color: '#080808',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={14} />
              Try Again
            </button>

            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.location.href = '/';
              }}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: '#1C1C1C',
                color: '#D6D3D1',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Home size={14} />
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
