'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#080808',
          color: '#F5F5F4',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: '480px',
            width: '90%',
            backgroundColor: '#121212',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '36px 28px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              color: '#EF4444',
            }}
          >
            <AlertCircle size={28} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px 0', color: '#F5F5F4' }}>
            Application Encountered an Error
          </h2>

          <p style={{ fontSize: '14px', color: '#A8A29E', lineHeight: 1.6, margin: '0 0 28px 0' }}>
            A temporary system error occurred. Your draft work and saved information are preserved.
          </p>

          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#F59E0B',
              color: '#080808',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
