import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import Menu from './Menu';
import ProfileAvatar from './ProfileAvatar';
import ForumAuthorMeta from './ForumAuthorMeta';
import { API_URL } from '../config/api';
import { getAuthToken } from '../utils/authSession';
import './Forum.css';
import './Social.css';

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function Forum() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${getAuthToken()}`,
  }), []);

  const fetchThreads = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}/forum/threads`, {
        headers: authHeaders(),
        params: { page, limit: 20 },
      });
      setThreads(response.data.threads || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load forum threads.');
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, page]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleCreateThread = async (event) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_URL}/forum/threads`,
        { title: title.trim(), body: body.trim() },
        { headers: authHeaders() },
      );
      setTitle('');
      setBody('');
      navigate(`/forum/${response.data.thread.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create thread.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthorStatusChange = (authorUserId, status, requestId) => {
    setThreads((current) => current.map((thread) => (
      thread.authorUserId === authorUserId ?
        { ...thread, connectionStatus: status, pendingRequestId: requestId } :
        thread
    )));
  };

  return (
    <div className="app-shell forum-container">
      <Menu />
      <div className="app-main">
        <header className="page-header forum-header">
          <div>
            <h2>Community <span>Forum</span></h2>
            <p className="forum-subtitle">Discuss layouts, techniques, and ideas with other creators.</p>
          </div>
        </header>

        <div className="forum-content">
          <section className="forum-compose account-panel">
            <h3>Start a discussion</h3>
            <form onSubmit={handleCreateThread}>
              <div className="form-group">
                <label htmlFor="forum-thread-title">Title</label>
                <input
                  id="forum-thread-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What's on your mind?"
                  maxLength={120}
                />
              </div>
              <div className="form-group">
                <label htmlFor="forum-thread-body">Message</label>
                <textarea
                  id="forum-thread-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Share details, ask questions, or start a conversation…"
                  rows={4}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Posting…' : 'Post discussion'}
              </button>
            </form>
          </section>

          {error && <p className="error-message">{error}</p>}

          <section className="forum-thread-list">
            <h3>Recent discussions</h3>
            {loading ? (
              <p className="loading-state">Loading discussions…</p>
            ) : threads.length === 0 ? (
              <p className="text-muted">No discussions yet. Be the first to start one.</p>
            ) : (
              <>
                <ul className="forum-threads">
                  {threads.map((thread) => (
                    <li key={thread.id}>
                      <Link to={`/forum/${thread.id}`} className="forum-thread-card">
                        <div className="forum-thread-card-header">
                          <Link
                            to={`/profile/${thread.authorUserId}`}
                            className="forum-author-avatar-link"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <ProfileAvatar
                              username={thread.authorUsername}
                              profileImageUrl={thread.authorProfileImageUrl}
                              size="sm"
                            />
                          </Link>
                          <div className="forum-thread-card-heading">
                            <h4>{thread.title}</h4>
                            <p className="forum-thread-meta">
                              <ForumAuthorMeta
                                authorUserId={thread.authorUserId}
                                authorUsername={thread.authorUsername}
                                connectionStatus={thread.connectionStatus}
                                pendingRequestId={thread.pendingRequestId}
                                onStatusChange={handleAuthorStatusChange}
                                stopPropagation
                              />
                              {' · '}
                              {formatRelativeTime(thread.lastActivityAt)}
                              {' · '}
                              {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                            </p>
                          </div>
                        </div>
                        <p className="forum-thread-preview">{thread.body}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
                {totalPages > 1 && (
                  <div className="forum-pagination">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {page} of {totalPages}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Forum;
