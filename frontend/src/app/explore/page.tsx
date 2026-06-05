'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ExplorePage() {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/portfolios/')
      .then(res => setPortfolios(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container animate-fade-in" style={{ paddingBottom: '90px', paddingTop: '20px' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1 className="font-bold" style={{ fontSize: '1.5rem' }}>Explore Work</h1>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '4px' 
        }}>
          {portfolios.length === 0 ? (
            <div style={{ gridColumn: 'span 3', padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No portfolios yet.
            </div>
          ) : (
            portfolios.map(p => (
              <div 
                key={p.id} 
                className="animate-scale"
                style={{ 
                  aspectRatio: '1 / 1', 
                  backgroundColor: 'var(--secondary)',
                  backgroundImage: `url(${p.media_url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer'
                }} 
              />
            ))
          )}
        </div>
      )}
    </main>
  );
}
