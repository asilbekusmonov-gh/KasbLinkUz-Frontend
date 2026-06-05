'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  // Hide bottom nav on authentication pages
  if (pathname === '/login' || pathname === '/register') return null;

  const navItems = [
    {
      path: '/',
      label: 'Home',
      icon: (isActive: boolean) => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={isActive ? 'rgba(59, 130, 246, 0.15)' : 'none'}
          stroke={isActive ? 'var(--primary)' : 'var(--text-muted)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'all 0.2s' }}
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      path: '/explore',
      label: 'Explore',
      icon: (isActive: boolean) => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={isActive ? 'rgba(59, 130, 246, 0.15)' : 'none'}
          stroke={isActive ? 'var(--primary)' : 'var(--text-muted)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'all 0.2s' }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    },
    {
      path: '/messages',
      label: 'Chat',
      icon: (isActive: boolean) => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={isActive ? 'rgba(59, 130, 246, 0.15)' : 'none'}
          stroke={isActive ? 'var(--primary)' : 'var(--text-muted)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'all 0.2s' }}
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: (isActive: boolean) => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={isActive ? 'rgba(59, 130, 246, 0.15)' : 'none'}
          stroke={isActive ? 'var(--primary)' : 'var(--text-muted)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'all 0.2s' }}
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    }
  ];

  return (
    <nav
      className="glass bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '68px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 1000,
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            href={item.path}
            key={item.path}
            className="animate-scale"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'color 0.2s',
              width: '64px',
              height: '100%',
              gap: '4px'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 8px',
              borderRadius: '12px',
              backgroundColor: isActive ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
              transition: 'all 0.2s'
            }}>
              {item.icon(isActive)}
            </div>
            <span style={{ 
              fontSize: '0.7rem', 
              fontWeight: isActive ? 600 : 500,
              letterSpacing: '-0.01em',
              transition: 'all 0.2s'
            }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
