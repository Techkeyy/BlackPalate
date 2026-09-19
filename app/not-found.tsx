import React from 'react';
import Link from 'next/link';
import { Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
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
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            color: '#F59E0B',
          }}
        >
          <Search size={28} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 10px 0', color: '#F5F5F4' }}>
          Page Not Found
        </h2>

        <p style={{ fontSize: '14px', color: '#A8A29E', lineHeight: 1.6, margin: '0 0 28px 0' }}>
          The page or tasting mission you are looking for does not exist or may have expired.
        </p>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: '#F59E0B',
            color: '#080808',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 700,
          }}
        >
          <ArrowLeft size={16} />
          Back to Tastings Marketplace
        </Link>
      </div>
    </div>
  );
}
