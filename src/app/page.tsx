'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Common State
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});
  const [services, setServices] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // Customer Specific State
  const [searchQuery, setSearchQuery] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [targetService, setTargetService] = useState<any>(null);
  const [orderTitle, setOrderTitle] = useState('');
  const [orderDesc, setOrderDesc] = useState('');
  const [orderAddress, setOrderAddress] = useState('');
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
  }, [selectedCategory, searchQuery, services]);

  const fetchWorkerOrders = () => {
    setOrdersLoading(true);
    api.get('/orders/')
      .then(res => setOrders(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(err => console.error('Failed to load orders', err))
      .finally(() => setOrdersLoading(false));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetService) return;

    setOrderSubmitting(true);
    try {
      await api.post('/orders/', {
        title: orderTitle,
        description: orderDesc,
        address: orderAddress,
        service: targetService.id,
        worker: targetService.worker, // Foreign key to WorkerProfile
      });
      setShowOrderModal(false);
      setOrderTitle('');
      setOrderDesc('');
      setOrderAddress('');
      setSuccessMsg('Order placed successfully! Check your profile for status.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || 'Failed to place order.');
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

  if (loading) return <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!isAuthenticated) return null;

  return (
    <main className="container animate-fade-in" style={{ paddingBottom: '90px', paddingTop: '20px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 className="font-bold text-primary" style={{ fontSize: '1.75rem', letterSpacing: '-0.025em' }}>
          KasbLink
        </h1>
        <p className="text-muted font-medium" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
          {user?.role === 'worker' ? 'Worker Dashboard - Received Jobs' : 'Service Feed - Hire a professional'}
        </p>
      </header>

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
            {filteredServices.length === 0 ? (
              <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No services found. Try another category or query.
              </div>
            ) : (
              filteredServices.map((service) => (
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
                  
                  <button 
                    onClick={() => {
                      setTargetService(service);
                      setShowOrderModal(true);
                    }}
                    style={{
                      marginTop: '8px',
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
              ))
            )}
          </section>

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
              zIndex: 2000,
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
                    <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="Your location/address"
                      value={orderAddress}
                      onChange={(e) => setOrderAddress(e.target.value)}
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
