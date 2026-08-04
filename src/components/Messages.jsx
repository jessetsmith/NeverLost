import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import Menu from './Menu';
import ProfileAvatar from './ProfileAvatar';
import { API_URL } from '../config/api';
import { getAuthToken } from '../utils/authSession';
import { LayoutContext } from '../context/LayoutContext';
import { runGuardedRequest } from '../utils/fetchGuard';
import './Social.css';

function Messages() {
  const { user } = useContext(LayoutContext);
  const currentUserId = user?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(searchParams.get('user') || '');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [selectedProfileImageUrl, setSelectedProfileImageUrl] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const threadEndRef = useRef(null);
  const activeMessagesRequestRef = useRef(0);
  const hasLoadedConversationsRef = useRef(false);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${getAuthToken()}`,
  }), []);

  const fetchConversations = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoadingConversations(true);
    }

    try {
      const response = await axios.get(`${API_URL}/messages/conversations`, {
        headers: authHeaders(),
      });
      setConversations(response.data.conversations || []);
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.error || 'Failed to load conversations.');
      }
    } finally {
      if (!silent) {
        setLoadingConversations(false);
      }
    }
  }, [authHeaders]);

  const fetchMessages = useCallback(async (userId, { refreshConversations = false } = {}) => {
    if (!userId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    const requestId = activeMessagesRequestRef.current + 1;
    activeMessagesRequestRef.current = requestId;

    setLoadingMessages(true);
    setError('');

    try {
      const response = await axios.get(`${API_URL}/messages/with/${userId}`, {
        headers: authHeaders(),
      });

      if (requestId !== activeMessagesRequestRef.current) {
        return;
      }

      setMessages(response.data.messages || []);
      if (response.data.otherUser?.username) {
        setSelectedUsername(response.data.otherUser.username);
      }
      if (response.data.otherUser?.profileImageUrl !== undefined) {
        setSelectedProfileImageUrl(response.data.otherUser.profileImageUrl || '');
      }

      if (refreshConversations) {
        await runGuardedRequest(
          'messages:conversations',
          () => fetchConversations({ silent: true }),
          { minIntervalMs: 1500 },
        );
      }
    } catch (err) {
      if (requestId === activeMessagesRequestRef.current) {
        setError(err.response?.data?.error || 'Failed to load messages.');
      }
    } finally {
      if (requestId === activeMessagesRequestRef.current) {
        setLoadingMessages(false);
      }
    }
  }, [authHeaders, fetchConversations]);

  const resolvePartnerProfile = useCallback(async (userId) => {
    const conversation = conversations.find((entry) => entry.userId === userId);
    if (conversation?.username) {
      setSelectedUsername(conversation.username);
      setSelectedProfileImageUrl(conversation.profileImageUrl || '');
      return;
    }

    try {
      await runGuardedRequest(`messages:username:${userId}`, async () => {
        const response = await axios.get(`${API_URL}/users/${userId}/public`, {
          headers: authHeaders(),
        });
        setSelectedUsername(response.data.profile?.username || 'Unknown user');
        setSelectedProfileImageUrl(response.data.profile?.profileImageUrl || '');
      }, { force: true });
    } catch {
      setSelectedUsername('Unknown user');
      setSelectedProfileImageUrl('');
    }
  }, [authHeaders, conversations]);

  const fetchConversationsRef = useRef(fetchConversations);
  const fetchMessagesRef = useRef(fetchMessages);
  const resolvePartnerProfileRef = useRef(resolvePartnerProfile);
  fetchConversationsRef.current = fetchConversations;
  fetchMessagesRef.current = fetchMessages;
  resolvePartnerProfileRef.current = resolvePartnerProfile;

  useEffect(() => {
    if (hasLoadedConversationsRef.current) {
      return;
    }

    hasLoadedConversationsRef.current = true;
    runGuardedRequest(
      'messages:conversations',
      () => fetchConversationsRef.current(),
      { force: true },
    );
  }, []);

  useEffect(() => {
    const userId = searchParams.get('user') || '';
    setSelectedUserId(userId);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUsername('');
      setSelectedProfileImageUrl('');
      setMessages([]);
      return;
    }

    resolvePartnerProfileRef.current(selectedUserId);
  }, [selectedUserId, conversations]);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    runGuardedRequest(
      `messages:thread:${selectedUserId}`,
      () => fetchMessagesRef.current(selectedUserId, { refreshConversations: true }),
      { force: true },
    );
  }, [selectedUserId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (conversation) => {
    setSelectedUserId(conversation.userId);
    setSelectedUsername(conversation.username);
    setSelectedProfileImageUrl(conversation.profileImageUrl || '');
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
      await runGuardedRequest(
        'messages:conversations',
        () => fetchConversations({ silent: true }),
        { minIntervalMs: 1500, force: true },
      );
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
                      <span className="conversation-item-main">
                        <ProfileAvatar
                          username={conversation.username}
                          profileImageUrl={conversation.profileImageUrl}
                          size="sm"
                        />
                        <span className="conversation-item-name">{conversation.username}</span>
                      </span>
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
                  <div className="messages-thread-header-user">
                    <ProfileAvatar
                      username={selectedUsername}
                      profileImageUrl={selectedProfileImageUrl}
                      size="sm"
                    />
                    <h3>{selectedUsername}</h3>
                  </div>
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
