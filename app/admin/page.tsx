'use client';
import { useState, useEffect, useMemo } from 'react';

// Helper to format seconds into Days/Hours or Expired
const formatTTL = (seconds: number, expiresAt?: number) => {
  if (seconds === -1) return { text: 'Permanent', status: 'permanent' };
  if (seconds === -2) {
    if (expiresAt && expiresAt > 0) {
      const dateStr = new Date(expiresAt).toLocaleDateString();
      return { text: `Expired (${dateStr})`, status: 'expired' };
    }
    return { text: 'Expired', status: 'expired' };
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) {
    const status = days <= 3 ? 'warning' : 'active';
    return { text: `${days}d ${hours}h remaining`, status };
  }
  const mins = Math.floor((seconds % 3600) / 60);
  return { text: `${hours}h ${mins}m remaining`, status: 'warning' };
};

export default function AdminDashboard() {
  const [secret, setSecret] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState({ msg: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load secret from localStorage if previously saved
  useEffect(() => {
    const savedSecret = localStorage.getItem('markhor_admin_secret');
    if (savedSecret) {
      setSecret(savedSecret);
    }
  }, []);

  // Save secret to localStorage when changed
  const handleSecretChange = (val: string) => {
    setSecret(val);
    localStorage.setItem('markhor_admin_secret', val);
  };

  // Function to fetch licenses list
  const fetchKeys = async () => {
    if (!secret) return;
    try {
      const res = await fetch('/api/admin/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret: secret })
      });
      const data = await res.json();
      if (res.ok) {
        setLicenses(data.licenses || []);
      } else {
        setStatus({ msg: `❌ ${data.error || 'Failed to fetch'}`, type: 'error' });
      }
    } catch (e) {
      console.error("Failed to fetch keys", e);
      setStatus({ msg: '❌ Network Error fetching list', type: 'error' });
    }
  };

  // Fetch list automatically when secret changes
  useEffect(() => {
    if (secret) {
      fetchKeys();
    }
  }, [secret]);

  // Function to generate new key
  const generateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ msg: '', type: '' });

    const finalKeyName = customKey.trim() || `MK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret: secret, licenseKey: finalKeyName, days: Number(days) })
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ msg: `✅ Generated: ${finalKeyName} (${days} days)`, type: 'success' });
        setCustomKey('');
        fetchKeys();
      } else {
        setStatus({ msg: `❌ Error: ${data.error}`, type: 'error' });
      }
    } catch (err) {
      setStatus({ msg: '❌ Network Error', type: 'error' });
    }
    setLoading(false);
  };

  // Function to extend key by +30 days (or custom amount)
  const extendKey = async (keyName: string, addDays: number = 30) => {
    setActionLoadingKey(`extend-${keyName}`);
    try {
      const res = await fetch('/api/admin/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret: secret, licenseKey: keyName, days: addDays })
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ msg: `⚡ Added +${addDays} days to ${keyName}`, type: 'success' });
        fetchKeys();
      } else {
        setStatus({ msg: `❌ Failed to extend: ${data.error}`, type: 'error' });
      }
    } catch (err) {
      setStatus({ msg: '❌ Network Error during extension', type: 'error' });
    }
    setActionLoadingKey(null);
  };

  // Function to revoke key
  const revokeKey = async (keyName: string) => {
    if (!confirm(`Are you sure you want to permanently delete license "${keyName}"?`)) return;
    setActionLoadingKey(`revoke-${keyName}`);
    try {
      const res = await fetch('/api/admin/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret: secret, licenseKey: keyName })
      });
      if (res.ok) {
        setStatus({ msg: `🗑️ Revoked key ${keyName}`, type: 'success' });
        fetchKeys();
      } else {
        const data = await res.json();
        setStatus({ msg: `❌ Error: ${data.error}`, type: 'error' });
      }
    } catch (err) {
      setStatus({ msg: '❌ Network Error revoking key', type: 'error' });
    }
    setActionLoadingKey(null);
  };

  // Copy key to clipboard
  const copyToClipboard = (keyStr: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopiedKey(keyStr);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Statistics
  const stats = useMemo(() => {
    const total = licenses.length;
    const active = licenses.filter(l => l.ttl > 0 || l.ttl === -1).length;
    const expired = licenses.filter(l => l.ttl === -2).length;
    return { total, active, expired };
  }, [licenses]);

  // Filtered licenses search
  const filteredLicenses = useMemo(() => {
    if (!searchQuery.trim()) return licenses;
    return licenses.filter(l => l.key.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [licenses, searchQuery]);

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', padding: '2rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Header Brand */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>
          MARKHOR CAPTCHA ADMIN
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '0.4rem', fontSize: '0.9rem' }}>
          Centralized License Key Management & Automatic Expiration System
        </p>
      </div>

      {/* --- GENERATOR CARD --- */}
      <div style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1.8rem', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', width: '100%', maxWidth: '580px', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 1.2rem 0', color: '#10b981', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔑</span> Generate License Key
        </h2>
        
        <form onSubmit={generateKey} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#94a3b8', fontWeight: 600 }}>Admin Secret Code</label>
            <input type="password" value={secret} onChange={(e) => handleSecretChange(e.target.value)} placeholder="Enter your ADMIN_SECRET..." required style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
             <div style={{ flex: 2 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#94a3b8', fontWeight: 600 }}>Custom Key Name (Optional)</label>
                <input type="text" value={customKey} onChange={(e) => setCustomKey(e.target.value)} placeholder="e.g. VIP-PRO-2026" style={inputStyle} />
             </div>
             <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: '#94a3b8', fontWeight: 600 }}>Validity (Days)</label>
                <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} min="-1" placeholder="30" style={inputStyle} />
             </div>
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', alignSelf: 'center' }}>Presets:</span>
            {[7, 30, 90, 365, -1].map((pDays) => (
              <button key={pDays} type="button" onClick={() => setDays(pDays)} style={{ padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px', border: days === pDays ? '1px solid #10b981' : '1px solid #334155', background: days === pDays ? 'rgba(16, 185, 129, 0.2)' : '#0f172a', color: days === pDays ? '#34d399' : '#94a3b8', cursor: 'pointer' }}>
                {pDays === -1 ? 'Forever' : `${pDays} Days`}
              </button>
            ))}
          </div>

          <button type="submit" disabled={loading || !secret} style={{ ...btnStyle, opacity: (!secret || loading) ? 0.6 : 1 }}>
            {loading ? 'Generating Key...' : '⚡ Generate License Key'}
          </button>
        </form>

        {status.msg && (
          <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600, background: status.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: status.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', color: status.type === 'success' ? '#34d399' : '#f87171' }}>
            {status.msg}
          </div>
        )}
      </div>

      {/* --- STATS COUNTERS CARDS --- */}
      {secret && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', width: '100%', maxWidth: '850px', marginBottom: '1.5rem' }}>
          <div style={statCardStyle}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>TOTAL KEYS</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>{stats.total}</span>
          </div>
          <div style={{ ...statCardStyle, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>ACTIVE KEYS</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>{stats.active}</span>
          </div>
          <div style={{ ...statCardStyle, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600 }}>EXPIRED KEYS</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', marginTop: '4px' }}>{stats.expired}</span>
          </div>
        </div>
      )}

      {/* --- LICENSES LIST CARD --- */}
      <div style={{ background: 'rgba(30, 41, 59, 0.7)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1.8rem', borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', width: '100%', maxWidth: '850px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📋</span> All License Keys ({filteredLicenses.length})
            </h2>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="🔍 Search key name..." style={{ ...inputStyle, width: '200px', padding: '8px 12px', fontSize: '0.85rem' }} />
              <button onClick={fetchKeys} style={{ ...btnStyle, padding: '8px 16px', fontSize: '0.85rem', width: 'auto', background: '#3b82f6', color: '#fff' }}>
                🔄 Refresh
              </button>
            </div>
        </div>

        {!secret ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>Enter your Admin Secret above to view license keys.</p>
        ) : filteredLicenses.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>No license keys found matching search.</p>
        ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '0.85rem' }}>
                          <th style={{ padding: '12px 10px' }}>LICENSE KEY</th>
                          <th style={{ padding: '12px 10px' }}>STATUS / REMAINING</th>
                          <th style={{ padding: '12px 10px', textAlign: 'right' }}>ACTIONS</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredLicenses.map((lic) => {
                          const formatted = formatTTL(lic.ttl, lic.expiresAt);
                          const isExtending = actionLoadingKey === `extend-${lic.key}`;
                          const isRevoking = actionLoadingKey === `revoke-${lic.key}`;

                          return (
                              <tr key={lic.key} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.5)', background: lic.isExpired ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                                  <td style={{ padding: '14px 10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: lic.isExpired ? '#94a3b8' : '#f8fafc' }}>
                                              {lic.key}
                                          </span>
                                          <button onClick={() => copyToClipboard(lic.key)} title="Copy Key" style={iconBtnStyle}>
                                              {copiedKey === lic.key ? '✅' : '📋'}
                                          </button>
                                      </div>
                                  </td>
                                  <td style={{ padding: '14px 10px' }}>
                                      <span style={getStatusBadgeStyle(formatted.status)}>
                                          {formatted.text}
                                      </span>
                                  </td>
                                  <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                          {/* Dedicated +30 Days Button */}
                                          <button onClick={() => extendKey(lic.key, 30)} disabled={isExtending} style={{ ...actionBtnStyle, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399' }}>
                                              {isExtending ? 'Updating...' : '➕ 30 Days'}
                                          </button>
                                          
                                          {/* Revoke/Delete Button */}
                                          <button onClick={() => revokeKey(lic.key)} disabled={isRevoking} style={{ ...actionBtnStyle, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171' }}>
                                              {isRevoking ? 'Deleting...' : 'Revoke'}
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
            </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white', outline: 'none', transition: 'border-color 0.2s' };
const btnStyle = { padding: '12px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#000', fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'transform 0.15s ease' };
const statCardStyle = { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column' as const };
const actionBtnStyle = { padding: '6px 12px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', display: 'inline-flex', alignItems: 'center', gap: '4px' };
const iconBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 4px' };

function getStatusBadgeStyle(status: string) {
  const base = { padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, display: 'inline-block' };
  if (status === 'permanent') return { ...base, background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' };
  if (status === 'expired') return { ...base, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' };
  if (status === 'warning') return { ...base, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' };
  return { ...base, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' };
}