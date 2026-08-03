import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaPlusSquare, FaUser, FaCog } from 'react-icons/fa';
import './Menu.css';

const navItems = [
    { to: '/dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
    { to: '/create-layout', icon: FaPlusSquare, label: 'New Layout' },
    { to: '/profile', icon: FaUser, label: 'Profile' },
    { to: '/settings', icon: FaCog, label: 'Settings' },
];

function Menu() {
    return (
        <nav className="menu" aria-label="Main navigation">
            <NavLink to="/dashboard" className="menu-brand" aria-label="NeverLost home">
                <span className="menu-brand-icon">NL</span>
            </NavLink>
            <ul className="menu-list">
                {navItems.map(({ to, icon: Icon, label }) => (
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
            </ul>
        </nav>
    );
}

export default Menu;
