import React from 'react';
import { Link } from 'react-router-dom';
import Home3D from './Home3D';
import './HomePage.css';

function HomePage() {
    return (
        <div className="home-page">
            <div className="home-hero">
                <div className="home-badge">Spatial Layout Tool</div>
                <h1>
                    Never<span>Lost</span>
                </h1>
                <p>
                    Design, organize, and visualize your spaces in 3D.
                    Build layouts that stick — no more getting lost.
                </p>
                <div className="home-actions">
                    <Link to="/login" className="btn btn-primary">Get Started</Link>
                    <Link to="/register" className="btn btn-secondary">Create Account</Link>
                </div>
            </div>
            <div className="home-visual">
                <Home3D />
                <div className="home-visual-overlay" />
            </div>
        </div>
    );
}

export default HomePage;
