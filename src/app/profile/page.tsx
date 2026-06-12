'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function ProfilePage() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const portfolioFileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'orders' | 'services' | 'portfolio' | 'settings'>('orders');

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Edit User details state
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  // Worker Profile state
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [wpBio, setWpBio] = useState('');
  const [wpStartTime, setWpStartTime] = useState('09:00');
  const [wpEndTime, setWpEndTime] = useState('18:00');
  const [wpIsAvailable, setWpIsAvailable] = useState(true);

  // Services state
  const [services, setServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceMinPrice, setServiceMinPrice] = useState('');
  const [serviceMaxPrice, setServiceMaxPrice] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');

  // Portfolios state
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [portfoliosLoading, setPortfoliosLoading] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [portfolioCategory, setPortfolioCategory] = useState('');
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Load basic data
  useEffect(() => {
    if (user) {
      setFirstName((user as any).first_name || '');
      setLastName((user as any).last_name || '');
      if ((user as any).profile_image) {
        const img = (user as any).profile_image;
        setProfileImage(img.startsWith('http') ? img : `${API_BASE}${img}`);
      }
      fetchOrders();
      fetchCategories();

      if (user.role === 'worker') {
        fetchWorkerProfile();
        fetchPortfolios();
      }
    }
  }, [user]);

  // Load services once workerProfile is available
  useEffect(() => {
    if (user?.role === 'worker') {
      fetchServices();
    }
  }, [user, workerProfile]);

  const fetchOrders = () => {
    setOrdersLoading(true);
    api.get('/orders/')
      .then(res => setOrders(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(err => console.error('Failed to load orders', err))
      .finally(() => setOrdersLoading(false));
  };

  const fetchCategories = () => {
    api.get('/categories/')
      .then(res => {
        const data = res.data || [];
        setCategories(data);
        const map: Record<number, string> = {};
        data.forEach((cat: any) => {
          map[cat.id] = cat.name;
        });
        setCategoryMap(map);
      })
      .catch(err => console.error('Failed to load categories', err));
  };

  const fetchWorkerProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await api.get('/worker-profiles/');
      const profiles = Array.isArray(res.data) ? res.data : res.data.results || [];
      const myProfile = profiles.find((p: any) => p.user_id === user?.id);
      
      if (myProfile) {
        setWorkerProfile(myProfile);
        setWpBio(myProfile.bio || '');
        setWpIsAvailable(myProfile.is_available);
        
        // Parse time strings
        if (myProfile.work_start_time) {
          setWpStartTime(myProfile.work_start_time.split('T')[1]?.substring(0, 5) || '09:00');
        }
        if (myProfile.work_end_time) {
          setWpEndTime(myProfile.work_end_time.split('T')[1]?.substring(0, 5) || '18:00');
        }
      }
    } catch (err) {
      console.error('Failed to load worker profile', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchServices = () => {
    if (!workerProfile) return;
    setServicesLoading(true);
    api.get('/services/')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        // Filter by current worker
        const filtered = data.filter((s: any) => s.worker === workerProfile.id);
        setServices(filtered);
      })
      .catch(err => console.error('Failed to load services', err))
      .finally(() => setServicesLoading(false));
  };

  const fetchPortfolios = () => {
    setPortfoliosLoading(true);
    api.get('/portfolio/')
      .then(res => {
        setPortfolios(Array.isArray(res.data) ? res.data : res.data.results || []);
      })
      .catch(err => console.error('Failed to load portfolios', err))
      .finally(() => setPortfoliosLoading(false));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('profile_image', file);

    try {
      const res = await api.patch('/users/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const img = res.data.profile_image;
      setProfileImage(img.startsWith('http') ? img : `${API_BASE}${img}`);
    } catch (err) {
      console.error('Failed to upload image', err);
      alert('Failed to upload profile picture.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // 1. Save general user profile
      await api.patch('/users/me/', {
        first_name: firstName,
        last_name: lastName,
      });

      // 2. Save worker profile details if they are a worker
      if (user?.role === 'worker') {
        const today = new Date().toISOString().split('T')[0];
        const work_start_time = `${today}T${wpStartTime}:00Z`;
        const work_end_time = `${today}T${wpEndTime}:00Z`;

        const profileData = {
          bio: wpBio,
          work_start_time,
          work_end_time,
          is_available: wpIsAvailable
        };

        if (workerProfile) {
          const res = await api.patch(`/worker-profiles/${workerProfile.id}/`, profileData);
          setWorkerProfile(res.data);
        } else {
          const res = await api.post('/worker-profiles/', profileData);
          setWorkerProfile(res.data);
        }
      }

      setEditing(false);
      alert('Profile saved successfully.');
    } catch (err) {
      console.error('Failed to save profile', err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  // Service CRUD operations
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerProfile) {
      alert('Please create a worker profile first under Settings.');
      return;
    }

    const payload = {
      name: serviceName,
      description: serviceDesc,
      min_price: parseInt(serviceMinPrice),
      max_price: parseInt(serviceMaxPrice),
      category: parseInt(serviceCategory),
      active: true
    };

    try {
      if (editingService) {
        await api.patch(`/services/${editingService.id}/`, payload);
      } else {
        await api.post('/services/', payload);
      }
      setShowServiceModal(false);
      setServiceName('');
      setServiceDesc('');
      setServiceMinPrice('');
      setServiceMaxPrice('');
      setServiceCategory('');
      setEditingService(null);
      fetchServices();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to save service.');
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.delete(`/services/${serviceId}/`);
      fetchServices();
    } catch (err) {
      console.error(err);
      alert('Failed to delete service.');
    }
  };

  // Portfolio CRUD operations
  const handleSavePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerProfile) {
      alert('Please setup your worker profile first.');
      return;
    }

    if (!portfolioFile && !editing) {
      alert('Please select an image for your portfolio.');
      return;
    }

    const formData = new FormData();
    formData.append('title', portfolioTitle);
    formData.append('description', portfolioDesc);
    formData.append('category', portfolioCategory);
    if (portfolioFile) {
      formData.append('image', portfolioFile);
    }

    try {
      await api.post('/portfolio/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowPortfolioModal(false);
      setPortfolioTitle('');
      setPortfolioDesc('');
      setPortfolioCategory('');
      setPortfolioFile(null);
      if (portfolioFileRef.current) portfolioFileRef.current.value = '';
      fetchPortfolios();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to save portfolio.');
    }
  };

  const handleDeletePortfolio = async (id: number) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) return;
    try {
      await api.delete(`/portfolio/${id}/`);
      fetchPortfolios();
    } catch (err) {
      console.error(err);
      alert('Failed to delete portfolio item.');
    }
  };

  // Reviews submission
  const handleOpenReviewModal = (orderId: number) => {
    setReviewOrderId(orderId);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrderId) return;

    setReviewSubmitting(true);
    try {
      await api.post('/reviews/', {
        order: reviewOrderId,
        rating: reviewRating,
        comment: reviewComment
      });
      setShowReviewModal(false);
      fetchOrders();
      alert('Thank you for your review!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const cancelOrder = async (orderId: number) => {
    try {
      await api.patch(`/orders/${orderId}/cancelled/`);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.[0] || 'Failed to cancel order.');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706' };
      case 'accepted': return { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' };
      case 'completed': return { bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' };
      case 'cancelled': return { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' };
      default: return { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' };
    }
  };

  if (loading) return <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!isAuthenticated) return null;

  return (
    <main className="container animate-fade-in" style={{ paddingBottom: '90px', paddingTop: '20px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 className="font-bold" style={{ fontSize: '1.5rem', letterSpacing: '-0.03em' }}>Profile</h1>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
          Manage your account and orders
        </p>
      </header>

      <div className="profile-layout">
        {/* Left column: User Card */}
        <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              backgroundColor: 'var(--secondary)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              border: '3px solid var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s',
            }}
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}

            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '28px',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {uploading ? (
                <span style={{ color: 'white', fontSize: '0.65rem' }}>...</span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />

          <div style={{ textAlign: 'center' }}>
            <h2 className="font-semibold" style={{ fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
              {(user as any)?.first_name || (user as any)?.username || 'User'}
              {(user as any)?.last_name ? ` ${(user as any).last_name}` : ''}
            </h2>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              @{(user as any)?.username}
            </p>
            <span style={{
              display: 'inline-block',
              marginTop: '8px',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: user?.role === 'worker' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
              color: user?.role === 'worker' ? '#2563eb' : '#059669',
            }}>
              {user?.role === 'worker' ? 'Worker' : 'Client'}
            </span>

            {user?.role === 'worker' && workerProfile && (
              <div style={{ marginTop: '12px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#eab308', fontWeight: 600 }}>★ {workerProfile.rating || '0.0'} Rating</span>
                <span style={{ color: 'var(--text-muted)' }}>{workerProfile.completed_orders_count || 0} completed jobs</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Content Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Tabs bar */}
          <div style={{ display: 'flex', gap: '0', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveTab('orders')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                backgroundColor: activeTab === 'orders' ? 'var(--primary)' : 'var(--card-bg)',
                color: activeTab === 'orders' ? 'white' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              {user?.role === 'worker' ? 'Jobs' : 'My Orders'}
            </button>

            {user?.role === 'worker' && (
              <>
                <button
                  onClick={() => setActiveTab('services')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    backgroundColor: activeTab === 'services' ? 'var(--primary)' : 'var(--card-bg)',
                    color: activeTab === 'services' ? 'white' : 'var(--text-muted)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s'
                  }}
                >
                  My Services
                </button>
                <button
                  onClick={() => setActiveTab('portfolio')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    backgroundColor: activeTab === 'portfolio' ? 'var(--primary)' : 'var(--card-bg)',
                    color: activeTab === 'portfolio' ? 'white' : 'var(--text-muted)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s'
                  }}
                >
                  My Portfolio
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('settings')}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                backgroundColor: activeTab === 'settings' ? 'var(--primary)' : 'var(--card-bg)',
                color: activeTab === 'settings' ? 'white' : 'var(--text-muted)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'all 0.2s'
              }}
            >
              Settings
            </button>
          </div>

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <section className="orders-grid">
              {ordersLoading ? (
                <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="glass-card" style={{ gridColumn: 'span 2', padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No orders yet.
                </div>
              ) : (
                orders.map((order) => {
                  const st = getStatusStyle(order.status);
                  const isReviewed = order.reviews !== null && order.reviews !== undefined;
                  return (
                    <div key={order.id} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 className="font-semibold" style={{ fontSize: '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.title}</h3>
                          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                            {order.address}
                          </p>
                        </div>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: st.bg,
                          color: st.color,
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                          whiteSpace: 'nowrap'
                        }}>
                          {order.status}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                        {order.description}
                      </p>

                      {/* Customer Actions */}
                      {user?.role === 'customer' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          {(order.status === 'pending' || order.status === 'accepted') && (
                            <button
                              onClick={() => cancelOrder(order.id)}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                backgroundColor: 'transparent',
                                color: '#ef4444',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                            >
                              Cancel Order
                            </button>
                          )}
                          {order.status === 'completed' && !isReviewed && (
                            <button
                              onClick={() => handleOpenReviewModal(order.id)}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                              }}
                            >
                              Write Review
                            </button>
                          )}
                          {order.status === 'completed' && isReviewed && (
                            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 500, padding: '4px 0' }}>
                              ✓ Reviewed
                            </span>
                          )}
                        </div>
                      )}

                      {/* Worker Actions */}
                      {user?.role === 'worker' && order.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                          <button
                            onClick={async () => {
                              await api.patch(`/orders/${order.id}/cancelled/`);
                              fetchOrders();
                            }}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '8px',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              backgroundColor: 'transparent',
                              color: '#ef4444',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={async () => {
                              await api.patch(`/orders/${order.id}/accepted/`);
                              fetchOrders();
                            }}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: 'var(--primary)',
                              color: 'white',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            Accept
                          </button>
                        </div>
                      )}

                      {user?.role === 'worker' && order.status === 'accepted' && (
                        <button
                          onClick={async () => {
                            await api.patch(`/orders/${order.id}/completed/`);
                            fetchOrders();
                          }}
                          style={{
                            marginTop: '4px',
                            padding: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#10b981',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          )}

          {/* Services Tab (Worker Only) */}
          {activeTab === 'services' && user?.role === 'worker' && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="font-semibold" style={{ fontSize: '1.1rem' }}>Services Offered</h3>
                <button
                  onClick={() => {
                    setEditingService(null);
                    setServiceName('');
                    setServiceDesc('');
                    setServiceMinPrice('');
                    setServiceMaxPrice('');
                    setServiceCategory(categories[0]?.id || '');
                    setShowServiceModal(true);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Add Service
                </button>
              </div>

              {servicesLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>Loading services...</div>
              ) : services.length === 0 ? (
                <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  You haven't listed any services yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {services.map(s => (
                    <div key={s.id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--primary)' }}>
                          {categoryMap[s.category] || 'Service'}
                        </span>
                        <h4 className="font-semibold" style={{ fontSize: '1.05rem', marginTop: '2px' }}>{s.name}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {s.description}
                        </p>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginTop: '8px' }}>
                          {s.min_price?.toLocaleString()} - {s.max_price?.toLocaleString()} UZS
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                        <button
                          onClick={() => {
                            setEditingService(s);
                            setServiceName(s.name || '');
                            setServiceDesc(s.description || '');
                            setServiceMinPrice(s.min_price?.toString() || '');
                            setServiceMaxPrice(s.max_price?.toString() || '');
                            setServiceCategory(s.category?.toString() || '');
                            setShowServiceModal(true);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--primary)',
                            backgroundColor: 'transparent',
                            color: 'var(--primary)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteService(s.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            backgroundColor: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Portfolio Tab (Worker Only) */}
          {activeTab === 'portfolio' && user?.role === 'worker' && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="font-semibold" style={{ fontSize: '1.1rem' }}>Portfolio Work</h3>
                <button
                  onClick={() => {
                    setPortfolioTitle('');
                    setPortfolioDesc('');
                    setPortfolioCategory(categories[0]?.id || '');
                    setPortfolioFile(null);
                    setShowPortfolioModal(true);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Add Portfolio
                </button>
              </div>

              {portfoliosLoading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>Loading portfolio...</div>
              ) : portfolios.length === 0 ? (
                <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No portfolio items listed yet.
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                  gap: '16px' 
                }}>
                  {portfolios.map(p => (
                    <div key={p.id} className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ 
                        height: '160px', 
                        backgroundImage: `url(${p.image.startsWith('http') ? p.image : `${API_BASE}${p.image}`})`, 
                        backgroundSize: 'cover', 
                        backgroundPosition: 'center',
                        position: 'relative'
                      }}>
                        <button
                          onClick={() => handleDeletePortfolio(p.id)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                          {categoryMap[p.category] || 'Work'}
                        </span>
                        <h4 className="font-semibold" style={{ fontSize: '0.95rem' }}>{p.title}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 className="font-semibold" style={{ fontSize: '1.1rem' }}>Account Details</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Username</label>
                  <input
                    type="text"
                    disabled
                    value={(user as any)?.username || ''}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--secondary)',
                      color: 'var(--text-muted)',
                      outline: 'none',
                      opacity: 0.7
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>First Name</label>
                    <input
                      type="text"
                      disabled={!editing}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: editing ? 'var(--background)' : 'var(--secondary)',
                        color: 'var(--foreground)',
                        outline: 'none',
                        opacity: editing ? 1 : 0.7,
                        width: '100%'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Last Name</label>
                    <input
                      type="text"
                      disabled={!editing}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: editing ? 'var(--background)' : 'var(--secondary)',
                        color: 'var(--foreground)',
                        outline: 'none',
                        opacity: editing ? 1 : 0.7,
                        width: '100%'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Phone</label>
                  <input
                    type="text"
                    disabled
                    value={(user as any)?.phone_number || ''}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--secondary)',
                      color: 'var(--text-muted)',
                      outline: 'none',
                      opacity: 0.7
                    }}
                  />
                </div>

                {/* Worker Profile Sub-form */}
                {user?.role === 'worker' && editing && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 className="font-semibold" style={{ fontSize: '1.1rem' }}>Worker Profile Details</h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Professional Bio *</label>
                      <textarea
                        required
                        rows={3}
                        value={wpBio}
                        onChange={(e) => setWpBio(e.target.value)}
                        placeholder="Write a short summary of your skills and experience..."
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--background)',
                          color: 'var(--foreground)',
                          outline: 'none',
                          resize: 'none',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Work Start Time *</label>
                        <input
                          type="time"
                          required
                          value={wpStartTime}
                          onChange={(e) => setWpStartTime(e.target.value)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>Work End Time *</label>
                        <input
                          type="time"
                          required
                          value={wpEndTime}
                          onChange={(e) => setWpEndTime(e.target.value)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground)',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        id="is_available"
                        checked={wpIsAvailable}
                        onChange={(e) => setWpIsAvailable(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="is_available" style={{ fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer' }}>
                        Available for job orders
                      </label>
                    </div>
                  </div>
                )}

                {/* Worker Profile Summary (Read Only Mode) */}
                {user?.role === 'worker' && !editing && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 className="font-semibold" style={{ fontSize: '0.95rem' }}>Worker Profile Status</h4>
                    {loadingProfile ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading profile details...</p>
                    ) : workerProfile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                        <p><strong style={{ color: 'var(--text-muted)' }}>Bio:</strong> {workerProfile.bio}</p>
                        <p><strong style={{ color: 'var(--text-muted)' }}>Working Hours:</strong> {wpStartTime} - {wpEndTime}</p>
                        <p><strong style={{ color: 'var(--text-muted)' }}>Availability:</strong> {workerProfile.is_available ? '🟢 Active & Hiring' : '🔴 Unavailable'}</p>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: 500 }}>
                        ⚠️ You haven't initialized your worker profile yet. Click "Edit Profile" to set up your bio and times.
                      </p>
                    )}
                  </div>
                )}

                {editing ? (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      onClick={() => setEditing(false)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'transparent',
                        color: 'var(--foreground)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        opacity: saving ? 0.7 : 1
                      }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      marginTop: '8px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--primary)',
                      backgroundColor: 'transparent',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Edit Profile
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="profile-logout-mobile"
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    width: '100%'
                  }}
                >
                  Log out
                </button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Write Review Modal */}
      {showReviewModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '16px'
        }}>
          <div className="glass-card animate-scale" style={{ width: '100%', maxWidth: '450px', padding: '24px', backgroundColor: 'var(--background)' }}>
            <h3 className="font-bold" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Leave a Review</h3>
            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Rating *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.8rem',
                        cursor: 'pointer',
                        color: star <= reviewRating ? '#eab308' : 'var(--secondary)',
                        transition: 'transform 0.1s'
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Comments *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share details of your experience with this freelancer..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--foreground)',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    color: 'var(--foreground)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: reviewSubmitting ? 0.7 : 1
                  }}
                >
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Modal (Add/Edit) */}
      {showServiceModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '16px'
        }}>
          <div className="glass-card animate-scale" style={{ width: '100%', maxWidth: '450px', padding: '24px', backgroundColor: 'var(--background)' }}>
            <h3 className="font-bold" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h3>
            <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Category *</label>
                <select
                  required
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--foreground)',
                    outline: 'none'
                  }}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kitchen Plumbing Repair"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--foreground)',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe your service in detail..."
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--foreground)',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Min Price (UZS) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Min price"
                    value={serviceMinPrice}
                    onChange={(e) => setServiceMinPrice(e.target.value)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--foreground)',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Max Price (UZS) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Max price"
                    value={serviceMaxPrice}
                    onChange={(e) => setServiceMaxPrice(e.target.value)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--card-bg)',
                      color: 'var(--foreground)',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    color: 'var(--foreground)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Portfolio Modal (Add) */}
      {showPortfolioModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '16px'
        }}>
          <div className="glass-card animate-scale" style={{ width: '100%', maxWidth: '450px', padding: '24px', backgroundColor: 'var(--background)' }}>
            <h3 className="font-bold" style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Add Portfolio Item</h3>
            <form onSubmit={handleSavePortfolio} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Category *</label>
                <select
                  required
                  value={portfolioCategory}
                  onChange={(e) => setPortfolioCategory(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--foreground)',
                    outline: 'none'
                  }}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Bathroom Plumbing"
                  value={portfolioTitle}
                  onChange={(e) => setPortfolioTitle(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--foreground)',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Project Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the project workflow and results..."
                  value={portfolioDesc}
                  onChange={(e) => setPortfolioDesc(e.target.value)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--foreground)',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Project Image *</label>
                <input
                  ref={portfolioFileRef}
                  type="file"
                  required
                  accept="image/*"
                  onChange={(e) => setPortfolioFile(e.target.files?.[0] || null)}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--foreground)',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowPortfolioModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    color: 'var(--foreground)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
