import React from 'react';
import { Link } from 'react-router-dom';
import ThreeDScene from './ThreeDScene'; // Reusing existing 3D scene component
import Home3D from './Home3D';
import Login from './Login';
import './HomePage.css'; // Styling for the home page

function HomePage() {
    return (
        <div className="home-container">
            <div className="welcome-section">
                <h1>Welcome to NeverLost</h1>
                <p>Your personalized tool for organizing and managing your spaces seamlessly.</p>
                <Link to="/login" className="login-button">Login</Link>
            </div>
            <div className="interactive-3d">
                <Home3D />
            </div>
        </div>
    );
}

export default HomePage;