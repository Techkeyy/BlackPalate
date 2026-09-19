'use client';

import React, { useState, useEffect } from 'react';

export default function Home() {
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeProof, setActiveProof] = useState<string>('');
  const [proofResults, setProofResults] = useState<Record<string, any>>({});

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setAuthStatus(data);
    } catch {
      setAuthStatus({ authenticated: false });
    }
  }

  async function runProof(name: string, endpoint: string, method = 'GET', body?: any) {
    setLoading(true);
    setActiveProof(name);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      setProofResults(prev => ({
        ...prev,
        [name]: {
          status: res.status,
          ok: res.ok,
          data,
          timestamp: new Date().toISOString(),
        },
      }));
    } catch (err: any) {
      setProofResults(prev => ({
        ...prev,
        [name]: {
          status: 500,
          ok: false,
          data: { error: err.message },
          timestamp: new Date().toISOString(),
        },
      }));
    } finally {
      setLoading(false);
      checkAuth();
    }
  }

  return (
    <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ borderBottom: '1px solid #282828', paddingBottom: '20px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', letterSpacing: '-0.5px', color: '#F7F5F0' }}>
              BLACKPALATE
            </h1>
            <p style={{ margin: 0, color: '#A0A0A0', fontSize: '14px' }}>
              Flynet Capability Proof &amp; Integration Harness
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '4px',
              backgroundColor: '#1E1E1E',
              border: '1px solid #333',
              fontSize: '12px',
              color: '#D97706',
              fontWeight: '600'
            }}>
              DIRECTIVE 001B
            </span>
          </div>
        </div>
      </header>

      {/* Auth & Environment Banner */}
      <section style={{ backgroundColor: '#1A1A1A', border: '1px solid #2C2C2C', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', margin: '0 0 12px 0', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          1. Flynet Member Identity &amp; OAuth
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>
              <strong>Status:</strong>{' '}
              {authStatus?.authenticated ? (
                <span style={{ color: '#10B981', fontWeight: 'bold' }}>Authenticated via Blackbird OAuth</span>
              ) : (
                <span style={{ color: '#EF4444' }}>Not Connected</span>
              )}
            </p>
            {authStatus?.profile && (
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#888' }}>
                User ID: {authStatus.profile.id} | Check-ins available: {authStatus.checkIns?.length || 0}
              </p>
            )}
          </div>
          <div>
            <a
              href="/api/auth/login"
              style={{
                display: 'inline-block',
                backgroundColor: '#D97706',
                color: '#000',
                padding: '10px 18px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              {authStatus?.authenticated ? 'Re-authenticate with Blackbird' : 'Connect Blackbird / Flynet'}
            </a>
          </div>
        </div>
      </section>

      {/* Proof Actions Grid */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#F7F5F0' }}>
          2. Required Capability Proofs
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Proof A */}
          <div style={{ backgroundColor: '#181818', border: '1px solid #282828', borderRadius: '6px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#F7F5F0' }}>
              Proof A: Restaurant Discovery
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#888' }}>
              Tests API key against <code>GET /restaurants</code> and inspects cuisine metadata.
            </p>
            <button
              onClick={() => runProof('proof_a', '/api/proofs/discovery')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#2A2A2A',
                border: '1px solid #444',
                color: '#FFF',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Run Proof A
            </button>
          </div>

          {/* Proof C & D */}
          <div style={{ backgroundColor: '#181818', border: '1px solid #282828', borderRadius: '6px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#F7F5F0' }}>
              Proof C &amp; D: Member Check-ins
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#888' }}>
              Tests OAuth token against <code>GET /users/me</code> and <code>/check_ins</code>.
            </p>
            <button
              onClick={() => runProof('proof_cd', '/api/auth/me')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#2A2A2A',
                border: '1px solid #444',
                color: '#FFF',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Run Proof C &amp; D
            </button>
          </div>

          {/* Proof E */}
          <div style={{ backgroundColor: '#181818', border: '1px solid #282828', borderRadius: '6px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#F7F5F0' }}>
              Proof E: Deterministic Qualification
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#888' }}>
              Derives qualification rules from real diner check-in history.
            </p>
            <button
              onClick={() => runProof('proof_e', '/api/proofs/qualify', 'POST')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#2A2A2A',
                border: '1px solid #444',
                color: '#FFF',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Run Proof E
            </button>
          </div>

          {/* Proof F */}
          <div style={{ backgroundColor: '#181818', border: '1px solid #282828', borderRadius: '6px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#F7F5F0' }}>
              Proof F: App FLY Balance
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#888' }}>
              Tests API key against <code>GET /balance</code> (requires <code>read:balance</code>).
            </p>
            <button
              onClick={() => runProof('proof_f', '/api/proofs/balance')}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#2A2A2A',
                border: '1px solid #444',
                color: '#FFF',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Run Proof F
            </button>
          </div>

          {/* Proof G */}
          <div style={{ backgroundColor: '#181818', border: '1px solid #282828', borderRadius: '6px', padding: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#F7F5F0' }}>
              Proof G: Reward &amp; Idempotency
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#888' }}>
              Tests <code>POST /issue_reward</code> with 1 FLY and tests 201 -&gt; 200 replay.
            </p>
            <button
              onClick={() => {
                const userId = authStatus?.profile?.id;
                if (!userId) {
                  alert('Please connect Blackbird OAuth first to get a target member user_id.');
                  return;
                }
                runProof('proof_g', '/api/proofs/reward', 'POST', { targetUserId: userId });
              }}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#2A2A2A',
                border: '1px solid #444',
                color: '#FFF',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Run Proof G
            </button>
          </div>
        </div>
      </section>

      {/* Proof Output Console */}
      <section style={{ backgroundColor: '#151515', border: '1px solid #222', borderRadius: '8px', padding: '20px' }}>
        <h2 style={{ fontSize: '14px', margin: '0 0 12px 0', color: '#A0A0A0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Live Verification Evidence Log
        </h2>

        {Object.keys(proofResults).length === 0 ? (
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            No proofs run yet. Trigger a proof action above or connect Blackbird OAuth.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(proofResults).map(([name, res]) => (
              <div key={name} style={{ backgroundColor: '#0D0D0D', border: '1px solid #282828', borderRadius: '4px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#D97706' }}>
                    {name.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '12px', color: res.ok ? '#10B981' : '#EF4444' }}>
                    HTTP {res.status} {res.ok ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>
                <pre style={{ margin: 0, fontSize: '12px', color: '#D4D4D4', overflowX: 'auto', maxHeight: '200px' }}>
                  {JSON.stringify(res.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

