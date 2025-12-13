'use client';
import { useState, useEffect } from 'react';

// Helper to format seconds into Days/Hours
const formatTTL = (seconds: number) => {
  if (seconds === -1) return 'Forever';
  if (seconds === -2) return 'Expired';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${(Math.floor((seconds % 3600) / 60))}m`;
};

export default function AdminDashboard() {
  const [secret, setSecret] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState({ msg: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [licenses, setLicenses] = useState<any[]>([]);

  // Function to fetch the list
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
        setLicenses(data.licenses);
      }
    } catch (e) { console.error("Failed to fetch keys"); }
  };

  // Function to generate key
  const generateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ msg: '', type: '' });

    const finalKeyName = customKey.trim() || `USER-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret: secret, licenseKey: finalKeyName, days: Number(days) })
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ msg: `✅ Created: ${finalKeyName}`, type: 'success' });
        setCustomKey('');
        fetchKeys(); // Refresh list automatically
      } else {
        setStatus({ msg: `❌ Error: ${data.error}`, type: 'error' });
      }
    } catch (err) { setStatus({ msg: '❌ Network Error', type: 'error' }); }
    setLoading(false);
  };

  // Function to delete key
  const revokeKey = async (keyName: string) => {
    if (!confirm(`Are you sure you want to delete ${keyName}?`)) return;
    await fetch('/api/admin/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSecret: secret, licenseKey: keyName })
    });
    fetchKeys(); // Refresh list
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '2rem', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* --- GENERATOR CARD --- */}
      <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', width: '100%', maxWidth: '500px', marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 1.5rem 0', color: '#10b981', textAlign: 'center' }}>Markhor Admin</h1>
        <form onSubmit={generateKey} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#94a3b8' }}>Admin Secret</label>
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Enter Secret..." required style={inputStyle} />
          </div>
          <div style={{display:'flex', gap:'10px'}}>
             <div style={{flex:2}}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#94a3b8' }}>License Key (Optional)</label>
                <input type="text" value={customKey} onChange={(e) => setCustomKey(e.target.value)} placeholder="Random if empty" style={inputStyle} />
             </div>
             <div style={{flex:1}}>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: '#94a3b8' }}>Days</label>
                <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} min="1" style={inputStyle} />
             </div>
          </div>
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Generating...' : 'Generate Key'}
          </button>
        </form>
        {status.msg && <div style={{ marginTop: '15px', padding: '10px', borderRadius: '6px', textAlign: 'center', background: status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: status.type === 'success' ? '#10b981' : '#ef4444' }}>{status.msg}</div>}
      </div>

      {/* --- LIST CARD --- */}
      <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', width: '100%', maxWidth: '800px' }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
            <h2 style={{ margin: 0, fontSize:'1.2rem' }}>Active Keys</h2>
            <button onClick={fetchKeys} style={{...btnStyle, padding:'8px 16px', fontSize:'0.9rem', width:'auto'}}>Refresh List</button>
        </div>

        {licenses.length === 0 ? (
            <p style={{textAlign:'center', color:'#64748b'}}>No keys found (or Secret not entered)</p>
        ) : (
            <table style={{width:'100%', borderCollapse:'collapse', textAlign:'left'}}>
                <thead>
                    <tr style={{borderBottom:'1px solid #334155', color:'#94a3b8', fontSize:'0.9rem'}}>
                        <th style={{padding:'10px'}}>Key</th>
                        <th style={{padding:'10px'}}>Expires In</th>
                        <th style={{padding:'10px', textAlign:'right'}}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {licenses.map((lic) => (
                        <tr key={lic.key} style={{borderBottom:'1px solid #334155'}}>
                            <td style={{padding:'12px', fontFamily:'monospace', color:'#f8fafc'}}>{lic.key}</td>
                            <td style={{padding:'12px', color: lic.ttl < 86400 ? '#f59e0b' : '#10b981'}}>
                                {formatTTL(lic.ttl)}
                            </td>
                            <td style={{padding:'12px', textAlign:'right'}}>
                                <button onClick={() => revokeKey(lic.key)} style={{background:'transparent', border:'1px solid #ef4444', color:'#ef4444', padding:'4px 8px', borderRadius:'4px', cursor:'pointer'}}>Revoke</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' };
const btnStyle = { padding: '12px', borderRadius: '6px', border: 'none', background: '#10b981', color: '#000', fontWeight: 'bold', cursor: 'pointer', width:'100%' };