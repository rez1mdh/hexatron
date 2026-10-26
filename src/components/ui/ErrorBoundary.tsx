// src/components/ui/ErrorBoundary.tsx
// React Error Boundary to catch render errors gracefully and prevent blank screens

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '3rem 2rem',
          maxWidth: '640px',
          margin: '2rem auto',
          background: 'var(--bg-surface, #1e1e24)',
          border: '1px solid var(--border, #3a3a46)',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.4))'
        }}>
          <div style={{
            display: 'inline-flex',
            padding: '12px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            marginBottom: '1rem'
          }}>
            <AlertTriangle size={32} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary, #fff)', marginBottom: '0.5rem' }}>
            {this.props.fallbackTitle || 'Something went wrong loading this content'}
          </h2>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #a1a1aa)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {this.state.error?.message || 'An unexpected rendering error occurred. You can retry or return to the encyclopedia home.'}
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} /> Try Again
            </button>
            <a
              href="/"
              className="btn btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              <Home size={14} /> Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
