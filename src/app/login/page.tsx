'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('auth/login/', { username, password });
      await login(res.data.access, res.data.refresh);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container animate-fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ width: '100%', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 className="font-bold text-primary" style={{ fontSize: '2rem', letterSpacing: '-0.05em' }}>
            KasbLink
          </h1>
          <p className="text-muted" style={{ marginTop: '8px' }}>Login to your account</p>
        </div>

        {error && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="font-medium" style={{ fontSize: '0.9rem' }}>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none',
                fontSize: '1rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="font-medium" style={{ fontSize: '0.9rem' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none',
                fontSize: '1rem'
              }}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="animate-scale"
            style={{
              marginTop: '12px',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--primary)',
              color: 'white',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Don't have an account? <Link href="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Register here</Link>
        </p>
      </div>
    </main>
  );
}
