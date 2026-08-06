import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import Menu from './Menu';
import ProfileAvatar from './ProfileAvatar';
import { API_URL } from '../config/api';
import { getAuthToken } from '../utils/authSession';
import './Forum.css';
import './Social.css';

function formatRelativeTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
}

function ForumThread() {
  const { threadId } = useParams();
  const [thread, setThread] = useState(null);
  const [posts, setPosts] = useState([]);
  const [replyBody, setReplyBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const threadEndRef = useRef(null);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${getAuthToken()}`,
  }), []);

  const fetchThread = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}/forum/threads/${threadId}`, {
        headers: authHeaders(),
      });
      setThread(response.data.thread);
      setPosts(response.data.posts || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load discussion.');
      setThread(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, threadId]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [posts]);

  const handleReply = async (event) => {
    event.preventDefault();
    if (!replyBody.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await axios.post(
        `${API_URL}/forum/threads/${threadId}/posts`,
        { body: replyBody.trim() },
        { headers: authHeaders() },
      );
      setPosts((current) => [...current, response.data.post]);
      setReplyBody('');
      setThread((current) => current ? {
        ...current,
        replyCount: (current.replyCount || 0) + 1,
        lastActivityAt: response.data.post.createdAt,
      } : current);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post reply.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell forum-container">
      <Menu />
      <div className="app-main">
        <header className="page-header forum-header">
          <div>
            <Link to="/forum" className="forum-back-link">← Back to forum</Link>
            <h2>Discussion <span>Thread</span></h2>
          </div>
        </header>

        <div className="forum-content forum-thread-page">
          {error && <p className="error-message">{error}</p>}
          {loading ? (
            <p className="loading-state">Loading discussion…</p>
          ) : thread ? (
            <>
              <article className="forum-thread-detail account-panel">
                <div className="forum-thread-card-header">
                  <ProfileAvatar
                    username={thread.authorUsername}
                    profileImageUrl={thread.authorProfileImageUrl}
                    size="md"
                  />
                  <div>
                    <h3>{thread.title}</h3>
                    <p className="forum-thread-meta">
                      {thread.authorUsername}
                      {' · '}
                      {formatRelativeTime(thread.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="forum-thread-body">{thread.body}</p>
              </article>

              <section className="forum-replies">
                <h3>{thread.replyCount} {thread.replyCount === 1 ? 'Reply' : 'Replies'}</h3>
                {posts.length === 0 ? (
                  <p className="text-muted">No replies yet. Start the conversation below.</p>
                ) : (
                  <ul className="forum-post-list">
                    {posts.map((post) => (
                      <li key={post.id} className="forum-post-card">
                        <div className="forum-thread-card-header">
                          <ProfileAvatar
                            username={post.authorUsername}
                            profileImageUrl={post.authorProfileImageUrl}
                            size="sm"
                          />
                          <div>
                            <p className="forum-post-author">{post.authorUsername}</p>
                            <p className="forum-thread-meta">{formatRelativeTime(post.createdAt)}</p>
                          </div>
                        </div>
                        <p className="forum-post-body">{post.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <div ref={threadEndRef} />
              </section>

              <section className="forum-reply-compose account-panel">
                <h3>Add a reply</h3>
                <form onSubmit={handleReply}>
                  <div className="form-group">
                    <label htmlFor="forum-reply-body" className="visually-hidden">Reply</label>
                    <textarea
                      id="forum-reply-body"
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                      placeholder="Write your reply…"
                      rows={4}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Posting…' : 'Post reply'}
                  </button>
                </form>
              </section>
            </>
          ) : (
            <p className="text-muted">Discussion not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForumThread;
