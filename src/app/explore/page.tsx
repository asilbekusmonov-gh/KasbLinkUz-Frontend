'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/api\/v1\/?$/, '');

export default function ExplorePage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [totalPortfolios, setTotalPortfolios] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  // Modal State
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [chatStarting, setChatStarting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Load Categories once
  useEffect(() => {
    if (isAuthenticated) {
      api.get('/categories/')
        .then(res => setCategories(res.data))
        .catch(err => console.error('Failed to load categories', err));
    }
  }, [isAuthenticated]);

  // Filter & Pagination Logic (Fetch from API)
  useEffect(() => {
    if (!isAuthenticated) return;
    setDataLoading(true);

    const fetchTimer = setTimeout(() => {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      if (selectedCategory !== null) {
        params.append('category', selectedCategory.toString());
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      api.get(`/portfolio/?${params.toString()}`)
        .then(res => {
          if (Array.isArray(res.data)) {
            setPortfolios(res.data);
            setTotalPortfolios(res.data.length);
          } else {
            setPortfolios(res.data.results || []);
            setTotalPortfolios(res.data.count || 0);
          }
        })
        .catch(err => console.error('Failed to load portfolios', err))
        .finally(() => setDataLoading(false));
    }, 300);

    return () => clearTimeout(fetchTimer);
  }, [currentPage, selectedCategory, searchQuery, isAuthenticated]);

  // Chat initiation helper
  const handleStartChat = async (workerUserId: number) => {
    if (!user) return;
    setChatStarting(true);
    try {
      const res = await api.get('/conversations/');
      const conversations = Array.isArray(res.data) ? res.data : res.data.results || [];
      const existing = conversations.find((c: any) => 
        (c.client === user.id && c.worker === workerUserId) ||
        (c.client === workerUserId && c.worker === user.id)
      );

      if (existing) {
        router.push(`/messages?id=${existing.id}`);
        return;
      }

      const createRes = await api.post('/conversations/', {
        client: user.id,
        worker: workerUserId
      });
      router.push(`/messages?id=${createRes.data.id}`);
    } catch (err) {
      console.error('Failed to initiate chat', err);
      alert('Failed to start chat session.');
    } finally {
      setChatStarting(false);
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  };

  if (loading || !isAuthenticated) {
    return <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <main className="container animate-fade-in" style={{ paddingBottom: '90px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 className="font-bold" style={{ fontSize: '1.5rem', letterSpacing: '-0.025em' }}>Explore Work</h1>
        <p className="text-muted font-medium" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
          Browse stunning projects completed by our platform experts
        </p>
      </header>

      {/* Explore stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div className="font-bold" style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>
            {totalPortfolios}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
            Total Projects
          </div>
        </div>
        <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div className="font-bold" style={{ fontSize: '1.2rem', color: '#10b981' }}>
            {categories.length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
            Categories
          </div>
        </div>
        <div className="glass-card" style={{ padding: '12px', textAlign: 'center' }}>
          <div className="font-bold" style={{ fontSize: '1.2rem', color: '#f59e0b' }}>
            {Array.from(new Set(portfolios.map(p => p.worker))).length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
            Active Experts
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search portfolios (e.g. Bathroom, Smart Home)..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--foreground)',
            outline: 'none',
            fontSize: '0.95rem',
            backdropFilter: 'blur(8px)'
          }}
        />

        {/* Category Filters */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => {
              setSelectedCategory(null);
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              backgroundColor: selectedCategory === null ? 'var(--primary)' : 'var(--card-bg)',
              color: selectedCategory === null ? 'white' : 'var(--foreground)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            All Projects
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setCurrentPage(1);
              }}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid var(--border-color)',
                backgroundColor: selectedCategory === cat.id ? 'var(--primary)' : 'var(--card-bg)',
                color: selectedCategory === cat.id ? 'white' : 'var(--foreground)',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Portfolios Grid */}
      {dataLoading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>Loading projects...</div>
      ) : portfolios.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No portfolios match your search or filter criteria.
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '20px' 
        }}>
          {portfolios.map((p) => (
            <div 
              key={p.id} 
              onClick={() => setSelectedProject(p)}
              className="glass-card animate-scale"
              style={{ 
                overflow: 'hidden', 
                cursor: 'pointer',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--card-bg)',
                display: 'flex',
                flexDirection: 'column'
              }} 
            >
              <div style={{ 
                width: '100%', 
                aspectRatio: '4 / 3', 
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: 'var(--secondary)'
              }}>
                <img
                  src={getImageUrl(p.image)}
                  alt={p.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.4s ease'
                  }}
                  className="portfolio-image-hover"
                />
                <div className="portfolio-overlay" style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%)',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '16px',
                  color: 'white'
                }}>
                  <div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      backgroundColor: 'var(--primary)', 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      fontWeight: 600,
                      display: 'inline-block',
                      marginBottom: '6px'
                    }}>
                      {p.category_detail?.name || 'Service'}
                    </span>
                    <h3 className="font-semibold" style={{ fontSize: '1rem', margin: 0 }}>{p.title}</h3>
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                    color: 'var(--primary)', 
                    padding: '2px 8px', 
                    borderRadius: '10px', 
                    fontWeight: 600
                  }}>
                    {p.category_detail?.name || 'Service'}
                  </span>
                  {p.created_at && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold" style={{ fontSize: '1rem', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', height: '2.4rem', lineHeight: 1.5 }}>
                  {p.description}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--secondary)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {p.worker_detail?.profile_image ? (
                        <img src={getImageUrl(p.worker_detail.profile_image)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                      {p.worker_detail?.user_detail?.first_name 
                        ? `${p.worker_detail.user_detail.first_name} ${p.worker_detail.user_detail.last_name || ''}` 
                        : p.worker_detail?.user_detail?.username || 'Expert'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>★</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>
                      {p.worker_detail?.rating || '5.0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {Math.ceil(totalPortfolios / itemsPerPage) > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginTop: '24px',
          marginBottom: '10px'
        }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: currentPage === 1 ? 'var(--text-muted)' : 'var(--foreground)',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 0.2s',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            Previous
          </button>
          
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            Page <strong style={{ color: 'var(--foreground)' }}>{currentPage}</strong> of {Math.ceil(totalPortfolios / itemsPerPage)}
          </span>

          <button
            disabled={currentPage === Math.ceil(totalPortfolios / itemsPerPage)}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalPortfolios / itemsPerPage)))}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: currentPage === Math.ceil(totalPortfolios / itemsPerPage) ? 'var(--text-muted)' : 'var(--foreground)',
              cursor: currentPage === Math.ceil(totalPortfolios / itemsPerPage) ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 0.2s',
              opacity: currentPage === Math.ceil(totalPortfolios / itemsPerPage) ? 0.5 : 1
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '16px'
        }}>
          <div className="glass-card animate-scale" style={{ 
            width: '100%', 
            maxWidth: '750px', 
            maxHeight: 'calc(100vh - 40px)',
            overflowY: 'auto',
            padding: 0, 
            backgroundColor: 'var(--background)',
            borderRadius: '20px',
            border: '1px solid var(--border-color)'
          }}>
            {/* Modal Image Header */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', backgroundColor: 'var(--secondary)' }}>
              <img 
                src={getImageUrl(selectedProject.image)} 
                alt={selectedProject.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button 
                onClick={() => setSelectedProject(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  zIndex: 10
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              <span style={{ 
                fontSize: '0.8rem', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                color: 'var(--primary)',
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontWeight: 600,
                display: 'inline-block',
                marginBottom: '10px'
              }}>
                {selectedProject.category_detail?.name || 'Service Category'}
              </span>

              <h2 className="font-bold" style={{ fontSize: '1.4rem', marginBottom: '12px', letterSpacing: '-0.02em' }}>
                {selectedProject.title}
              </h2>

              <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--foreground)', marginBottom: '24px', whiteSpace: 'pre-line' }}>
                {selectedProject.description}
              </p>

              {/* Freelancer Profile section */}
              <div className="glass-card" style={{ 
                padding: '16px', 
                borderRadius: '16px', 
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--secondary)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {selectedProject.worker_detail?.profile_image ? (
                      <img src={getImageUrl(selectedProject.worker_detail.profile_image)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 className="font-semibold" style={{ fontSize: '1rem', margin: 0 }}>
                      {selectedProject.worker_detail?.user_detail?.first_name 
                        ? `${selectedProject.worker_detail.user_detail.first_name} ${selectedProject.worker_detail.user_detail.last_name || ''}` 
                        : selectedProject.worker_detail?.user_detail?.username || 'Expert'}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>★</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{selectedProject.worker_detail?.rating || '5.0'}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({selectedProject.worker_detail?.completed_orders_count || 0} jobs)
                      </span>
                    </div>
                  </div>
                </div>

                {selectedProject.worker_detail?.bio && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    {selectedProject.worker_detail.bio}
                  </p>
                )}

                {/* Direct Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <button
                    onClick={() => {
                      if (selectedProject.worker_detail?.user_detail?.id) {
                        handleStartChat(selectedProject.worker_detail.user_detail.id);
                      }
                    }}
                    disabled={chatStarting || selectedProject.worker_detail?.user_detail?.id === user?.id}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: selectedProject.worker_detail?.user_detail?.id === user?.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      opacity: selectedProject.worker_detail?.user_detail?.id === user?.id ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    {chatStarting ? 'Connecting...' : selectedProject.worker_detail?.user_detail?.id === user?.id ? 'Your Project' : 'Chat with Freelancer'}
                  </button>
                  <button
                    onClick={() => setSelectedProject(null)}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--foreground)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
