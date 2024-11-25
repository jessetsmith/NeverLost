import React from 'react';
import { Link } from 'react-router-dom';
import { FaTachometerAlt, FaPlusSquare, FaUser, FaCog } from 'react-icons/fa'; // Importing icons
import './Menu.css'; // Styling for the menu

function Menu() {
    return (
        <nav className="menu">
            <ul>
                <li><Link to="/dashboard"><FaTachometerAlt size={20} /></Link></li>
                <li><Link to="/create-layout"><FaPlusSquare size={20} /></Link></li>
                <li><Link to="/profile"><FaUser size={20} /></Link></li>
                <li><Link to="/settings"><FaCog size={20} /></Link></li>
            </ul>
        </nav>
    );
}

export default Menu;
