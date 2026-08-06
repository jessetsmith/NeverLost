import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaPlusSquare, FaBook, FaCompass, FaEnvelope, FaUser, FaCog, FaComments } from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import { LayoutContext } from '../context/LayoutContext';
import './Menu.css';

const mainNavItems = [
    { to: '/home', icon: FaHome, label: 'Home' },
    { to: '/explore', icon: FaCompass, label: 'Explore' },
    { to: '/create-layout', icon: FaPlusSquare, label: 'New Layout' },
    { to: '/library', icon: FaBook, label: 'Library' },
    { to: '/messages', icon: FaEnvelope, label: 'Messages' },
    { to: '/forum', icon: FaComments, label: 'Forum' },
];

function Menu() {
    const { user } = useContext(LayoutContext);
    const profilePath = user?.id ? `/profile/${user.id}` : '/settings';

    return (
        <nav className="menu" aria-label="Main navigation">
            <NavLink to="/home" className="menu-brand" aria-label="NeverLost home">
                <span className="menu-brand-icon">NL</span>
            </NavLink>
            <ul className="menu-list">
                {mainNavItems.map(({ to, icon: Icon, label }) => (
                    <li key={to}>
                        <NavLink
                            to={to}
                            className={({ isActive }) => `menu-link${isActive ? ' active' : ''}`}
                            aria-label={label}
                        >
                            <Icon size={18} />
                            <span className="menu-tooltip">{label}</span>
                        </NavLink>
                    </li>
                ))}
                <li>
                    <NotificationBell />
                </li>
            </ul>
            <div className="menu-footer">
                <NavLink
                    to={profilePath}
                    className={({ isActive }) => `menu-link${isActive ? ' active' : ''}`}
                    aria-label="Profile"
                >
                    <FaUser size={18} />
                    <span className="menu-tooltip">Profile</span>
                </NavLink>
                <NavLink
                    to="/settings"
                    className={({ isActive }) => `menu-link${isActive ? ' active' : ''}`}
                    aria-label="Settings"
                >
                    <FaCog size={18} />
                    <span className="menu-tooltip">Settings</span>
                </NavLink>
            </div>
        </nav>
    );
}

export default Menu;
