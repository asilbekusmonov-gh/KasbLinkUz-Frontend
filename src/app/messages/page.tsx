'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1/').replace('/api/v1/', '');

function ChatContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeChatIdParam = searchParams.get('id');

  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const [showSidebarOnMobile, setShowSidebarOnMobile] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Fetch conversations
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations/');
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setConversations(data);
      setConversationsLoading(false);
    } catch (err) {
      console.error('Failed to fetch conversations', err);
      setConversationsLoading(false);
    }
  };

  // Determine active conversation based on query param or first item
  useEffect(() => {
    if (conversations.length > 0) {
      if (activeChatIdParam) {
        const found = conversations.find(c => c.id === parseInt(activeChatIdParam));
        if (found) {
          setActiveConversation(found);
          setShowSidebarOnMobile(false);
          return;
        }
      }
      // If we don't have active chat param but we are on desktop, select first conversation
      if (window.innerWidth > 768 && !activeConversation) {
        setActiveConversation(conversations[0]);
      }
    }
  }, [conversations, activeChatIdParam]);

  // Load message history and connect to WebSocket for the active conversation
  useEffect(() => {
    if (!activeConversation) return;

    // Fetch message history
    const fetchMessages = async () => {
      setMessagesLoading(true);
      try {
        const res = await api.get(`/messages/?conversation=${activeConversation.id}`);
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        // Sort messages chronologically by timestamp/id
        const sorted = data.sort((a: any, b: any) => a.id - b.id);
        setMessages(sorted);
      } catch (err) {
        console.error('Failed to load messages', err);
      } finally {
        setMessagesLoading(false);
      }
    };

    fetchMessages();

    // Setup WebSocket
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsHost = API_BASE.replace('http://', '').replace('https://', '');
    const wsUrl = `${wsScheme}://${wsHost}/ws/chat/conversation_${activeConversation.id}/`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const incomingMsg = data.message;
        // Append message only if it is not already in list
        if (incomingMsg && incomingMsg.conversation === activeConversation.id) {
          setMessages(prev => {
            if (prev.find(m => m.id === incomingMsg.id)) return prev;
            return [...prev, incomingMsg];
          });
        }
      } catch (err) {
        console.error('WebSocket message parsing error', err);
      }
    };

    socket.onerror = (err) => console.error('WebSocket error', err);
    socket.onclose = () => console.log('WebSocket closed');

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [activeConversation]);

  // Auto scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesLoading]);

  // Send Message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !activeConversation || !user) return;

    const text = newMessageText.trim();
    setNewMessageText(''); // Clear input instantly for responsiveness

    try {
      // 1. Save message to DB
      const res = await api.post('/messages/', {
        conversation: activeConversation.id,
        message: text,
        message_type: 'text'
      });

      const savedMessage = res.data;

      // 2. Add locally instantly
      setMessages(prev => [...prev, savedMessage]);

      // 3. Broadcast to peer via WS
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          message: savedMessage
        }));
      }
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Failed to send message. Please try again.');
    }
  };

  // Helper to retrieve user profile data for other participant
  const getOtherParticipant = (conv: any) => {
    if (!user) return null;
    return conv.client === user.id ? conv.worker_detail : conv.client_detail;
  };

  if (loading || !isAuthenticated) {
    return <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <main className="container" style={{ 
      paddingBottom: '90px', 
      paddingTop: '20px', 
      height: 'calc(100vh - 20px)', 
      display: 'flex', 
      flexDirection: 'column'
    }}>
      <header style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!showSidebarOnMobile && (
          <button 
            onClick={() => {
              setShowSidebarOnMobile(true);
              setActiveConversation(null);
              router.push('/messages');
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--secondary)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}
        <h1 className="font-bold" style={{ fontSize: '1.5rem', letterSpacing: '-0.03em' }}>
          {showSidebarOnMobile ? 'Messages' : 'Chat'}
        </h1>
      </header>

      {/* Main Container */}
      <div className="glass-card" style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden', 
        minHeight: 0, 
        backgroundColor: 'var(--card-bg)' 
      }}>
        {/* Sidebar: Lists Conversations */}
        {(showSidebarOnMobile || window.innerWidth > 768) && (
          <div style={{ 
            width: showSidebarOnMobile ? '100%' : '320px', 
            borderRight: '1px solid var(--border-color)', 
            display: 'flex', 
            flexDirection: 'column',
            overflowY: 'auto'
          }}>
            {conversationsLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading conversations...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                <p className="text-muted" style={{ fontSize: '0.95rem' }}>No conversations yet.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  When you select "Chat" on a service card, your conversations will appear here.
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const partner = getOtherParticipant(conv);
                const isActive = activeConversation?.id === conv.id;
                return (
                  <div 
                    key={conv.id}
                    onClick={() => {
                      setActiveConversation(conv);
                      setShowSidebarOnMobile(false);
                      router.push(`/messages?id=${conv.id}`);
                    }}
                    style={{
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: isActive ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--secondary)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isActive ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      flexShrink: 0
                    }}>
                      {partner?.profile_image ? (
                        <img
                          src={partner.profile_image.startsWith('http') ? partner.profile_image : `${API_BASE}${partner.profile_image}`}
                          alt="Avatar"
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
                      <h3 className="font-semibold" style={{ fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {partner?.first_name 
                          ? `${partner.first_name} ${partner.last_name || ''}`
                          : partner?.username || 'User'}
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginTop: '2px' }}>
                        {partner?.role === 'worker' ? 'Freelancer' : 'Client'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Chat Area: Message Feed & Input */}
        {(!showSidebarOnMobile || window.innerWidth > 768) && (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            height: '100%'
          }}>
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div style={{ 
                  padding: '16px 20px', 
                  borderBottom: '1px solid var(--border-color)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px' 
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--secondary)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getOtherParticipant(activeConversation)?.profile_image ? (
                      <img
                        src={getOtherParticipant(activeConversation).profile_image.startsWith('http') 
                          ? getOtherParticipant(activeConversation).profile_image 
                          : `${API_BASE}${getOtherParticipant(activeConversation).profile_image}`}
                        alt="Avatar"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ fontSize: '1rem' }}>
                      {getOtherParticipant(activeConversation)?.first_name
                        ? `${getOtherParticipant(activeConversation).first_name} ${getOtherParticipant(activeConversation).last_name || ''}`
                        : getOtherParticipant(activeConversation)?.username || 'User'}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {getOtherParticipant(activeConversation)?.role === 'worker' ? 'Freelancer' : 'Client'}
                    </span>
                  </div>
                </div>

                {/* Message Feed */}
                <div style={{ 
                  flex: 1, 
                  padding: '20px', 
                  overflowY: 'auto', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px' 
                }}>
                  {messagesLoading ? (
                    <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', padding: '24px' }}>
                      <p style={{ fontSize: '0.9rem' }}>No messages yet.</p>
                      <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Type a message below to start the conversation.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender === user?.id;
                      return (
                        <div 
                          key={msg.id}
                          style={{
                            display: 'flex',
                            justifyContent: isMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{
                            maxWidth: '75%',
                            padding: '10px 14px',
                            borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                            backgroundColor: isMe ? 'var(--primary)' : 'var(--secondary)',
                            color: isMe ? 'white' : 'var(--foreground)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            fontSize: '0.9rem',
                            lineHeight: 1.4,
                            wordBreak: 'break-word'
                          }}>
                            {msg.message}
                            <div style={{
                              fontSize: '0.65rem',
                              color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                              textAlign: 'right',
                              marginTop: '4px'
                            }}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <form 
                  onSubmit={handleSendMessage}
                  style={{ 
                    padding: '16px', 
                    borderTop: '1px solid var(--border-color)', 
                    display: 'flex', 
                    gap: '10px', 
                    alignItems: 'center' 
                  }}
                >
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Type your message..."
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '24px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                      outline: 'none',
                      fontSize: '0.95rem'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                      border: 'none',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                Select a conversation to start messaging.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}
