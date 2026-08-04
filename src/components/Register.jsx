import React, { useState, useContext } from 'react';
import axios from 'axios';
import { LayoutContext } from '../context/LayoutContext';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config/api';
import { saveAuthSession } from '../utils/authSession';
import './Register.css';

function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const { setUser, setToken } = useContext(LayoutContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return setError('Passwords do not match.');
        }

        try {
            const response = await axios.post(`${API_URL}/users/register`, {
                username,
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
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        }
    };

    return (
        <div className="auth-page">
            <form onSubmit={handleSubmit} className="auth-card">
                <h2>Join NeverLost</h2>
                <p className="auth-subtitle">Create your account and start building</p>
                {error && <p className="error-message">{error}</p>}
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="yourname"
                        autoComplete="username"
                    />
                </div>
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
                        minLength={8}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        autoComplete="new-password"
                    />
                </div>
                <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '0.5rem' }}>
                    Create Account
                </button>
                <p className="auth-link">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </form>
        </div>
    );
}

export default Register;
