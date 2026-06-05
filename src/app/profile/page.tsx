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

  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');

  // Editing state
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFirstName((user as any).first_name || '');
      setLastName((user as any).last_name || '');
      if ((user as any).profile_image) {
        const img = (user as any).profile_image;
        setProfileImage(img.startsWith('http') ? img : `${API_BASE}${img}`);
      }
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = () => {
    setOrdersLoading(true);
    api.get('/orders/')
      .then(res => setOrders(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(err => console.error('Failed to load orders', err))
      .finally(() => setOrdersLoading(false));
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
      await api.patch('/users/me/', {
        first_name: firstName,
        last_name: lastName,
      });
      setEditing(false);
    } catch (err) {
      console.error('Failed to save profile', err);
      alert('Failed to save changes.');
    } finally {
      setSaving(false);
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
      {/* Header */}
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="font-bold" style={{ fontSize: '1.5rem', letterSpacing: '-0.03em' }}>Profile</h1>
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}
        >
          Logout
        </button>
      </header>

      {/* Profile Card */}
      <div className="glass-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        {/* Avatar with Upload */}
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

          {/* Overlay */}
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

        {/* User Info */}
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
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginTop: '24px', marginBottom: '16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
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
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
        >
          {user?.role === 'worker' ? 'Jobs' : 'My Orders'}
        </button>
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
            fontSize: '0.9rem',
            transition: 'all 0.2s'
          }}
        >
          Settings
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ordersLoading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No orders yet.
            </div>
          ) : (
            orders.map((order) => {
              const st = getStatusStyle(order.status);
              return (
                <div key={order.id} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 className="font-semibold" style={{ fontSize: '1.05rem' }}>{order.title}</h3>
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

                  {/* Customer can cancel pending/accepted orders */}
                  {user?.role === 'customer' && (order.status === 'pending' || order.status === 'accepted') && (
                    <button
                      onClick={() => cancelOrder(order.id)}
                      style={{
                        marginTop: '4px',
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

                  {/* Worker can accept pending orders */}
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

                  {/* Worker can complete accepted orders */}
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

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 className="font-semibold" style={{ fontSize: '1.05rem' }}>Account Details</h3>

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
          </div>
        </section>
      )}
    </main>
  );
}
