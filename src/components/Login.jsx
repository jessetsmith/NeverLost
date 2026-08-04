import React, { useState, useContext } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config/api';
import { saveAuthSession } from '../utils/authSession';
import './Login.css';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { setUser, setToken } = useContext(LayoutContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(`${API_URL}/users/login`, {
                email,
                password,
            });

            saveAuthSession({
                token: response.data.token,
                user: response.data.user,
            });
            setUser(response.data.user);
            setToken(response.data.token);
            navigate('/home');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-page-inner">
                <h1 className="auth-title">Never<span>Lost</span></h1>
                <form onSubmit={handleSubmit} className="auth-card">
                    <h2>Welcome back</h2>
                    <p className="auth-subtitle">Sign in to your account</p>
                {error && <p className="error-message">{error}</p>}
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        autoComplete="email"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        autoComplete="current-password"
                    />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                    Sign In
                </button>
                <p className="auth-link">
                    No account? <Link to="/register">Create one</Link>
                </p>
                </form>
            </div>
        </div>
    );
}

export default Login;
