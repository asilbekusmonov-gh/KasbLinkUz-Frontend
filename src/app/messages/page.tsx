'use client';

import React from 'react';

export default function MessagesPage() {
  return (
    <main className="container animate-fade-in" style={{ paddingBottom: '90px', paddingTop: '20px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 className="font-bold" style={{ fontSize: '1.5rem' }}>Messages & Orders</h1>
      </header>

      <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
        <p className="text-muted">No messages yet.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
          When you send a request or receive an offer, your chats will appear here.
        </p>
      </div>
    </main>
  );
}
