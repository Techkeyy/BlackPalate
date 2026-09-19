'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, RefreshCw } from 'lucide-react';
import { UserSafeError } from '@/lib/error-messages';

interface CalloutAlertProps {
  error?: UserSafeError | null;
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function CalloutAlert({
  error,
  type = 'error',
  title,
  message,
  actionText,
  onAction,
  onDismiss,
}: CalloutAlertProps) {
  const alertTitle = error?.title || title || 'Attention Required';
  const alertMessage = error?.message || message || 'An unexpected condition occurred.';
  const alertActionText = error?.actionText || actionText;

  const typeConfig = {
    error: {
      bg: 'rgba(239, 68, 68, 0.12)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      iconColor: '#EF4444',
      Icon: AlertCircle,
    },
    warning: {
      bg: 'rgba(245, 158, 11, 0.12)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      iconColor: '#F59E0B',
      Icon: AlertCircle,
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.12)',
      border: '1px solid rgba(59, 130, 246, 0.3)',
      iconColor: '#3B82F6',
      Icon: Info,
    },
    success: {
      bg: 'rgba(16, 185, 129, 0.12)',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      iconColor: '#10B981',
      Icon: CheckCircle2,
    },
  };

  const config = typeConfig[type] || typeConfig.error;
  const { Icon } = config;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        backgroundColor: config.bg,
        border: config.border,
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        color: '#F5F5F4',
        fontSize: '14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
        <Icon size={20} color={config.iconColor} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', color: '#F5F5F4' }}>
            {alertTitle}
          </div>
          <div style={{ color: '#D6D3D1', lineHeight: 1.5, fontSize: '13px' }}>
            {alertMessage}
          </div>
          {alertActionText && onAction && (
            <button
              onClick={onAction}
              type="button"
              style={{
                marginTop: '10px',
                padding: '6px 14px',
                backgroundColor: '#1C1C1C',
                color: '#F5F5F4',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={12} />
              {alertActionText}
            </button>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          type="button"
          aria-label="Dismiss notification"
          style={{
            background: 'none',
            border: 'none',
            color: '#A8A29E',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
