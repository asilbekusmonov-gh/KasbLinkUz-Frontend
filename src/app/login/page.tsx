'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import styles from './page.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const getErrorMessage = (err: unknown) => {
    if (typeof err === 'object' && err !== null) {
      const typedError = err as { response?: { data?: { detail?: string } } };
      if (typeof typedError.response?.data?.detail === 'string') {
        return typedError.response.data.detail;
      }
    }
    return 'Login failed. Please check credentials.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('auth/login/', { username, password });
      await login(res.data.access, res.data.refresh);
      router.push('/');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`container animate-fade-in ${styles.page}`}>
      <div className={styles.backgroundGlow} aria-hidden="true" />
      <div className={`glass-card ${styles.card}`}>
        <div className={styles.header}>
          <span className={styles.badge}>Welcome back</span>
          <h1 className="font-bold text-primary">KasbLink</h1>
          <p className="text-muted">Login to continue booking and messaging.</p>
        </div>

        {error && (
          <div className={styles.errorBox} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="username" className="font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className="font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`animate-scale ${styles.submitButton}`}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <p className={styles.footerText}>
          Don&apos;t have an account?{' '}
          <Link href="/register" className={styles.registerLink}>
            Register here
          </Link>
        </p>
      </div>
    </main>
  );
}
