// Navbar.jsx
import React, { useEffect } from 'react';
import './Navbar.css';

const Navbar = () => {
  
  useEffect(() => {
    const decorationContainer = document.getElementById('seedDecoration');
    if (!decorationContainer) return;

    const seedIcons = [
      'fas fa-seedling', 
      'fas fa-leaf', 
      'fas fa-spa'
    ];
    
    decorationContainer.innerHTML = '';
   
    for (let i = 0; i < 12; i++) {
      const seed = document.createElement('i');
      const randomIcon = seedIcons[Math.floor(Math.random() * seedIcons.length)];
      seed.className = `seed-icon ${randomIcon}`;
      
      
      const leftPos = Math.random() * 100;
      const topPos = Math.random() * 100;
      const delay = Math.random() * 5;
      const size = 0.5 + Math.random() * 1;
      
      seed.style.left = `${leftPos}%`;
      seed.style.top = `${topPos}%`;
      seed.style.animationDelay = `${delay}s`;
      seed.style.fontSize = `${size}rem`;
      
      decorationContainer.appendChild(seed);
    }
  }, []);

  return (
    <nav className="navbar navbar-seed">
      <div className="nav-decoration" id="seedDecoration"></div>
      <div className="container d-flex justify-content-center align-items-center">
        <a className="navbar-brand-seed" href="/">
          <i className="fas fa-seedling"></i>
          <span className="brand-text">Seeds</span>
        </a>
      </div>
    </nav>
  );
};

export default Navbar;