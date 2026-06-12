'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1/').replace('/api/v1/', '');

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Common State
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [services, setServices] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // Customer Specific State
  const [searchQuery, setSearchQuery] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [targetService, setTargetService] = useState<any>(null);
  const [orderTitle, setOrderTitle] = useState('');
  const [orderDesc, setOrderDesc] = useState('');
  const [orderStreet, setOrderStreet] = useState('');
  const [orderCityId, setOrderCityId] = useState('');
  const [orderDistrictId, setOrderDistrictId] = useState('');
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Worker Specific State
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Load Categories & Services (for Customers)
  useEffect(() => {
    if (isAuthenticated) {
      // Fetch categories
      api.get('/categories/')
        .then(res => {
          setCategories(res.data);
          const map: Record<number, string> = {};
          res.data.forEach((cat: any) => {
            map[cat.id] = cat.name;
          });
          setCategoryMap(map);
        })
        .catch(err => console.error('Failed to load categories', err));

      if (user?.role === 'customer') {
        // Fetch services
        api.get('/services/')
          .then(res => {
            const data = Array.isArray(res.data) ? res.data : res.data.results || [];
            setServices(data);
            setFilteredServices(data);
          })
          .catch(err => console.error('Failed to load services', err));
      } else if (user?.role === 'worker') {
        // Fetch received orders
        fetchWorkerOrders();
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'customer') {
      api.get('/cities/')
        .then(res => setCities(Array.isArray(res.data) ? res.data : res.data.results || []))
        .catch(err => console.error('Failed to load cities', err));
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!orderCityId) {
      setDistricts([]);
      setOrderDistrictId('');
      return;
    }

    setDistrictsLoading(true);
    api.get(`/districts/?city=${orderCityId}`)
      .then(res => setDistricts(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(err => console.error('Failed to load districts', err))
      .finally(() => setDistrictsLoading(false));
  }, [orderCityId]);

  // Filter Logic for Customer
  useEffect(() => {
    let result = services;

    if (selectedCategory !== null) {
      result = result.filter(s => s.category === selectedCategory);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.description && s.description.toLowerCase().includes(query))
      );
    }

    setFilteredServices(result);
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, services]);

  const fetchWorkerOrders = () => {
    setOrdersLoading(true);
    api.get('/orders/')
      .then(res => setOrders(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(err => console.error('Failed to load orders', err))
      .finally(() => setOrdersLoading(false));
  };

  const buildOrderAddress = () => {
    const cityName = cities.find((c) => c.id === Number(orderCityId))?.name;
    const districtName = districts.find((d) => d.id === Number(orderDistrictId))?.name;
    const parts: string[] = [];
    if (orderStreet.trim()) parts.push(orderStreet.trim());
    if (districtName) parts.push(districtName);
    if (cityName) parts.push(cityName);
    return parts.join(', ');
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetService) return;
    if (!orderCityId || !orderDistrictId) {
      alert('Please select a region and district.');
      return;
    }

    setOrderSubmitting(true);
    try {
      await api.post('/orders/', {
        title: orderTitle,
        description: orderDesc,
        address: buildOrderAddress(),
        service: targetService.id,
        worker: targetService.worker_detail?.id,
      });
      setShowOrderModal(false);
      setOrderTitle('');
      setOrderDesc('');
      setOrderStreet('');
      setOrderCityId('');
      setOrderDistrictId('');
      setSuccessMsg('Order placed successfully! Check your profile for status.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      const errorData = err.response?.data;
      let errorMsg = 'Failed to place order.';
      if (errorData) {
        if (typeof errorData === 'string') {
          errorMsg = errorData;
        } else if (errorData.detail) {
          errorMsg = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMsg = errorData.non_field_errors.join(', ');
        } else {
          const fieldErrors = Object.entries(errorData)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join('\n');
          if (fieldErrors) {
            errorMsg = fieldErrors;
          }
        }
      }
      alert(errorMsg);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const updateOrderStatus = async (orderId: number, statusAction: 'accepted' | 'completed' | 'cancelled') => {
    try {
      await api.patch(`/orders/${orderId}/${statusAction}/`);
      fetchWorkerOrders();
    } catch (err) {
      console.error(err);
      alert('Failed to update order status.');
    }
  };

  const handleStartChat = async (workerUserId: number) => {
    if (!user) return;
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
    }
  };

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const paginatedServices = filteredServices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!isAuthenticated) return null;

  return (
    <main className="container animate-fade-in">
      <header style={{ marginBottom: '24px' }}>
        <h1 className="font-bold" style={{ fontSize: '1.5rem', letterSpacing: '-0.025em' }}>
          {user?.role === 'worker' ? 'Received Jobs' : 'Service Feed'}
        </h1>
        <p className="text-muted font-medium" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
          {user?.role === 'worker' ? 'Manage incoming job requests' : 'Hire a professional for your needs'}
        </p>
      </header>

      {/* Welcome Banner */}
      <div className="glass-card" style={{
        padding: '24px',
        marginBottom: '20px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.06) 100%)',
        borderLeft: '3px solid var(--primary)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <h2 className="font-semibold" style={{ fontSize: '1.15rem', marginBottom: '4px' }}>
            {new Date().getHours() < 12 ? '☀️ Good morning' : new Date().getHours() < 18 ? '🌤️ Good afternoon' : '🌙 Good evening'},{' '}
            {(user as any)?.first_name || (user as any)?.username || 'there'}!
          </h2>
          <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
            {user?.role === 'worker'
              ? 'Check your incoming jobs and stay on top of your schedule.'
              : 'Find trusted professionals and book services in minutes.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
            minWidth: '80px'
          }}>
            <div className="font-bold" style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>
              {user?.role === 'worker' ? orders.length : filteredServices.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
              {user?.role === 'worker' ? 'Jobs' : 'Services'}
            </div>
          </div>
          <div style={{
            padding: '12px 20px',
            borderRadius: '12px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
            minWidth: '80px'
          }}>
            <div className="font-bold" style={{ fontSize: '1.3rem', color: '#10b981' }}>
              {categories.length}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
              Categories
            </div>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '10px',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          color: '#059669',
          fontWeight: 500,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* CUSTOMER INTERFACE */}
      {user?.role === 'customer' && (
        <>
          {/* Search bar */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search services (e.g. Electrician, Plumbing)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          </div>

          {/* Categories Horizontal Scroll */}
          <div 
            style={{ 
              display: 'flex', 
              gap: '8px', 
              overflowX: 'auto', 
              paddingBottom: '12px', 
              marginBottom: '20px',
              scrollbarWidth: 'none'
            }}
          >
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: selectedCategory === null ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                backgroundColor: selectedCategory === null ? 'var(--primary)' : 'var(--card-bg)',
                color: selectedCategory === null ? 'white' : 'var(--foreground)',
                fontWeight: 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: selectedCategory === cat.id ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  backgroundColor: selectedCategory === cat.id ? 'var(--primary)' : 'var(--card-bg)',
                  color: selectedCategory === cat.id ? 'white' : 'var(--foreground)',
                  fontWeight: 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Services list */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {paginatedServices.length === 0 ? (
              <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No services found. Try another category or query.
              </div>
            ) : (
              paginatedServices.map((service) => (
                <div key={service.id} className="glass-card animate-scale" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="text-primary font-semibold" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {categoryMap[service.category] || 'General'}
                      </span>
                      <h3 className="font-semibold" style={{ fontSize: '1.15rem', marginTop: '2px' }}>
                        {service.name || 'Professional Service'}
                      </h3>
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem' }}>
                      {service.min_price?.toLocaleString()} - {service.max_price?.toLocaleString()} UZS
                    </div>
                  </div>
                  
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                    {service.description || 'No description provided.'}
                  </p>
                  
                  {service.worker_detail && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 0',
                      borderTop: '1px solid var(--border-color)',
                      borderBottom: '1px solid var(--border-color)',
                      marginTop: '4px'
                    }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--secondary)',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {service.worker_detail.user_detail?.profile_image ? (
                          <img
                            src={service.worker_detail.user_detail.profile_image.startsWith('http')
                              ? service.worker_detail.user_detail.profile_image
                              : `${API_BASE}${service.worker_detail.user_detail.profile_image}`}
                            alt="Worker"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {service.worker_detail.user_detail?.first_name 
                              ? `${service.worker_detail.user_detail.first_name} ${service.worker_detail.user_detail.last_name || ''}`
                              : service.worker_detail.user_detail?.username || 'Professional'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                            ★ {service.worker_detail.rating || '0.0'}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {service.worker_detail.bio || 'Available for bookings'} • {service.worker_detail.completed_orders_count || 0} jobs
                        </p>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    {service.worker_detail?.user_detail && (
                      <button 
                        onClick={() => handleStartChat(service.worker_detail.user_detail.id)}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid var(--primary)',
                          backgroundColor: 'transparent',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        Chat
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setTargetService(service);
                        setOrderTitle(service.name || '');
                        setOrderDesc('');
                        setOrderStreet('');
                        setOrderCityId('');
                        setOrderDistrictId('');
                        setShowOrderModal(true);
                      }}
                      style={{
                        flex: 2,
                        padding: '12px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Send Request
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Pagination Controls */}
          {totalPages > 1 && (
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
                Page <strong style={{ color: 'var(--foreground)' }}>{currentPage}</strong> of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--card-bg)',
                  color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--foreground)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          )}

          {/* Order Request Modal */}
          {showOrderModal && targetService && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}>
              <div className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '28px', backgroundColor: 'var(--background)' }}>
                <h3 className="font-bold" style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Book Service</h3>
                <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fix Kitchen Sink"
                      value={orderTitle}
                      onChange={(e) => setOrderTitle(e.target.value)}
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
                      placeholder="Describe what needs to be done..."
                      value={orderDesc}
                      onChange={(e) => setOrderDesc(e.target.value)}
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
                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Region (Viloyat) *</label>
                    <select
                      required
                      value={orderCityId}
                      onChange={(e) => {
                        setOrderCityId(e.target.value);
                        setOrderDistrictId('');
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--foreground)',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select region</option>
                      {cities.map((city) => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>District (Tuman) *</label>
                    <select
                      required
                      value={orderDistrictId}
                      onChange={(e) => setOrderDistrictId(e.target.value)}
                      disabled={!orderCityId || districtsLoading}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--card-bg)',
                        color: 'var(--foreground)',
                        outline: 'none',
                        opacity: !orderCityId || districtsLoading ? 0.7 : 1
                      }}
                    >
                      <option value="">
                        {!orderCityId ? 'Select a region first' : districtsLoading ? 'Loading...' : 'Select district'}
                      </option>
                      {districts.map((district) => (
                        <option key={district.id} value={district.id}>{district.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Street / Address detail</label>
                    <input
                      type="text"
                      placeholder="e.g. Chilonzor 15, house 42"
                      value={orderStreet}
                      onChange={(e) => setOrderStreet(e.target.value)}
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

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowOrderModal(false)}
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
                      disabled={orderSubmitting}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        opacity: orderSubmitting ? 0.7 : 1
                      }}
                    >
                      {orderSubmitting ? 'Requesting...' : 'Request'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* WORKER INTERFACE */}
      {user?.role === 'worker' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ordersLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading requests...</div>
          ) : orders.length === 0 ? (
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No incoming job requests yet.
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 className="font-semibold" style={{ fontSize: '1.15rem' }}>{order.title}</h3>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '2px' }}>Loc: {order.address}</p>
                  </div>
                  <span 
                    style={{ 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      backgroundColor: order.status === 'pending' ? 'rgba(245, 158, 11, 0.15)' :
                                       order.status === 'accepted' ? 'rgba(59, 130, 246, 0.15)' :
                                       order.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: order.status === 'pending' ? '#d97706' :
                             order.status === 'accepted' ? '#2563eb' :
                             order.status === 'completed' ? '#059669' : '#dc2626'
                    }}
                  >
                    {order.status.toUpperCase()}
                  </span>
                </div>

                <p style={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                  {order.description}
                </p>

                {order.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #ef4444',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => updateOrderStatus(order.id, 'accepted')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Accept
                    </button>
                  </div>
                )}

                {order.status === 'accepted' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                    style={{
                      marginTop: '8px',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#10b981',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Complete Job
                  </button>
                )}
              </div>
            ))
          )}
        </section>
      )}
    </main>
  );
}
