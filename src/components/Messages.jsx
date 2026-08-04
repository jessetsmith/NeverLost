import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import Menu from './Menu';
import { API_URL } from '../config/api';
import { LayoutContext } from '../context/LayoutContext';
import './Social.css';

function Messages() {
  const { user } = useContext(LayoutContext);
  const currentUserId = user?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(searchParams.get('user') || '');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const threadEndRef = useRef(null);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  }), []);

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const response = await axios.get(`${API_URL}/messages/conversations`, {
        headers: authHeaders(),
      });
      setConversations(response.data.conversations || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }, [authHeaders]);

  const fetchMessages = useCallback(async (userId) => {
    if (!userId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/messages/with/${userId}`, {
        headers: authHeaders(),
      });
      setMessages(response.data.messages || []);
      fetchConversations();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, [authHeaders, fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const userId = searchParams.get('user');
    if (userId) {
      setSelectedUserId(userId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedUserId) return;

    const conversation = conversations.find((entry) => entry.userId === selectedUserId);
    setSelectedUsername(conversation?.username || 'User');
    fetchMessages(selectedUserId);
  }, [selectedUserId, conversations, fetchMessages]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (conversation) => {
    setSelectedUserId(conversation.userId);
    setSelectedUsername(conversation.username);
    setSearchParams({ user: conversation.userId });
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!selectedUserId || !messageBody.trim()) return;

    setSending(true);
    setError('');

    try {
      const response = await axios.post(
        `${API_URL}/messages`,
        { toUserId: selectedUserId, body: messageBody.trim() },
        { headers: authHeaders() },
      );
      setMessages((prev) => [...prev, response.data]);
      setMessageBody('');
      fetchConversations();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="app-shell messages-container">
      <Menu />
      <div className="app-main messages-main">
        <header className="page-header">
          <h2>Messages</h2>
        </header>

        <div className="messages-layout">
          <aside className="messages-sidebar">
            <h3>Conversations</h3>
            {loadingConversations ? (
              <p className="loading-state">Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="text-muted">No conversations yet.</p>
            ) : (
              <ul className="conversation-list">
                {conversations.map((conversation) => (
                  <li key={conversation.userId}>
                    <button
                      type="button"
                      className={`conversation-item${selectedUserId === conversation.userId ? ' active' : ''}`}
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <span>{conversation.username}</span>
                      {conversation.unreadCount > 0 && (
                        <span className="conversation-unread">{conversation.unreadCount}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <section className="messages-thread">
            {!selectedUserId ? (
              <p className="text-muted messages-placeholder">Select a conversation to view messages.</p>
            ) : (
              <>
                <div className="messages-thread-header">
                  <h3>{selectedUsername}</h3>
                </div>
                {error && <p className="error-message">{error}</p>}
                <div className="messages-thread-body">
                  {loadingMessages ? (
                    <p className="loading-state">Loading messages…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-muted">No messages yet. Say hello!</p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`message-bubble${message.fromUserId === currentUserId ? ' outgoing' : ' incoming'}`}
                      >
                        {message.body}
                      </div>
                    ))
                  )}
                  <div ref={threadEndRef} />
                </div>
                <form className="messages-compose" onSubmit={handleSend}>
                  <input
                    type="text"
                    placeholder="Write a message…"
                    value={messageBody}
                    onChange={(event) => setMessageBody(event.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm" disabled={sending}>
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Messages;
