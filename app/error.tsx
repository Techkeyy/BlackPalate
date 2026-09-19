'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { mapErrorToUserMessage } from '@/lib/error-messages';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[BlackPalate App Error]:', error);
  }, [error]);

  const userSafe = mapErrorToUserMessage(error);

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#080808',
        color: '#F5F5F4',
      }}
    >
      <div
        role="alert"
        style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: '#121212',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '40px 32px',
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
          {userSafe.title}
        </h2>

        <p style={{ fontSize: '14px', color: '#A8A29E', lineHeight: 1.6, margin: '0 0 28px 0' }}>
          {userSafe.message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
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

          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.location.href = '/';
            }}
            style={{
              padding: '12px 20px',
              backgroundColor: '#1C1C1C',
              color: '#D6D3D1',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Home size={16} />
            Return to Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}
