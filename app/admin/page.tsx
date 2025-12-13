'use client';
import { useState } from 'react';

export default function AdminDashboard() {
  const [secret, setSecret] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState({ msg: '', type: '' });
  const [loading, setLoading] = useState(false);

  const generateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ msg: '', type: '' });

    // Auto-generate name if empty
    const finalKeyName = customKey.trim() || `USER-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            adminSecret: secret, 
            licenseKey: finalKeyName, 
            days: Number(days) 
        })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ msg: `✅ Success! Key Created: ${finalKeyName}`, type: 'success' });
        setCustomKey(''); // Clear key name for next one
      } else {
        setStatus({ msg: `❌ Error: ${data.error || 'Failed'}`, type: 'error' });
      }
    } catch (err) {
      setStatus({ msg: '❌ Network Error', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0f172a', color: '#f8fafc',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: '#1e293b', padding: '2rem', borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)', width: '100%', maxWidth: '400px'
      }}>
        <h1 style={{ margin: '0 0 1.5rem 0', color: '#10b981', textAlign: 'center' }}>Markhor Admin</h1>
        
        <form onSubmit={generateKey} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#94a3b8' }}>Admin Secret</label>
            <input 
              type="password" 
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter your ADMIN_SECRET"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#94a3b8' }}>License Key (Optional)</label>
            <input 
              type="text" 
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="Leave empty for random"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#94a3b8' }}>Duration (Days)</label>
            <input 
              type="number" 
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              min="1"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '12px', borderRadius: '6px', border: 'none',
              background: loading ? '#334155' : '#10b981', color: loading ? '#94a3b8' : '#000',
              fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px'
            }}
          >
            {loading ? 'Generating...' : 'Generate Key'}
          </button>

        </form>

        {status.msg && (
          <div style={{
            marginTop: '20px', padding: '10px', borderRadius: '6px', textAlign: 'center',
            background: status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: status.type === 'success' ? '#10b981' : '#ef4444', border: `1px solid ${status.type === 'success' ? '#10b981' : '#ef4444'}`
          }}>
            {status.msg}
          </div>
        )}
      </div>
    </div>
  );
}