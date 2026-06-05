'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'customer' | 'worker'>('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('auth/register/', {
        username,
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        role,
      });
      await login(res.data.access, res.data.refresh);
      router.push('/');
    } catch (err: any) {
      if (err.response?.data) {
        const firstErrorKey = Object.keys(err.response.data)[0];
        const errorVal = err.response.data[firstErrorKey];
        setError(`${firstErrorKey}: ${Array.isArray(errorVal) ? errorVal[0] : errorVal}`);
      } else {
        setError('Registration failed. Please check your details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container animate-fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '40px', paddingBottom: '40px' }}>
      <div className="glass-card" style={{ width: '100%', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 className="font-bold text-primary" style={{ fontSize: '2rem', letterSpacing: '-0.05em' }}>
            KasbLink
          </h1>
          <p className="text-muted" style={{ marginTop: '8px' }}>Create your account</p>
        </div>

        {error && (
          <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              type="button"
              onClick={() => setRole('customer')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: role === 'customer' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                backgroundColor: role === 'customer' ? 'var(--card-bg)' : 'transparent',
                fontWeight: 600,
                color: role === 'customer' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Client (Private)
            </button>
            <button
              type="button"
              onClick={() => setRole('worker')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: role === 'worker' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                backgroundColor: role === 'worker' ? 'var(--card-bg)' : 'transparent',
                fontWeight: 600,
                color: role === 'worker' ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              Worker (Public)
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="font-medium" style={{ fontSize: '0.9rem' }}>Username *</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. jason_dev"
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="font-medium" style={{ fontSize: '0.9rem' }}>Email</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. client@domain.com"
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="font-medium" style={{ fontSize: '0.9rem' }}>First Name</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  outline: 'none',
                  width: '100%'
                }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="font-medium" style={{ fontSize: '0.9rem' }}>Last Name</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  outline: 'none',
                  width: '100%'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="font-medium" style={{ fontSize: '0.9rem' }}>Phone Number (9 digits) *</label>
            <input 
              type="text" 
              required
              maxLength={9}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="901234567"
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label className="font-medium" style={{ fontSize: '0.9rem' }}>Password *</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none'
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
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Login here</Link>
        </p>
      </div>
    </main>
  );
}
