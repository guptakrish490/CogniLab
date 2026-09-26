import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await register(name, email, password);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#0F172A', margin: 0 }}>CogniLab</h2>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>Create Researcher Account</p>
        </div>
        {error && <div style={{ backgroundColor: '#FEF2F2', color: '#991B1B', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Full Name</label>
            <input type=" text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Alex Vance" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }} />
 </div>
 <div>
 <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Email Address</label>
 <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex.vance@lab.org" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }} />
 </div>
 <div>
 <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>Password (min 6 chars)</label>
 <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CBD5E1', marginTop: '4px', boxSizing: 'border-box' }} />
 </div>
 <button type="submit" disabled={loading} style={{ backgroundColor: '#2563EB', color: '#FFFFFF', padding: '12px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
 {loading ? 'Creating Account...' : 'Register'}
 </button>
 </form>
 <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', marginTop: '20px' }}>
 Already have an account? <Link to="/login" style={{ color: '#2563EB', fontWeight: '600' }}>Sign in</Link>
 </p>
 </div>
 </div>
 );
};

export default Register;
