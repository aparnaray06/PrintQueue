import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('pq_user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('pq_token');
    localStorage.removeItem('pq_user');
    navigate('/auth');
  };

  return (
    <header className="navbar">
      <Link to="/" className="nav-logo">PrintQueue</Link>
      <nav className="nav-links">
        <Link to="/track" className="nav-item">Track Code</Link>

        {!user && (
          <Link to="/auth" className="nav-shop-btn">Login / Register</Link>
        )}

        {user?.role === 'student' && (
          <>
            <Link to="/" className="nav-item">Send Print</Link>
            <Link to="/profile" className="nav-item">My Profile & Orders</Link>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </>
        )}

        {user?.role === 'shopkeeper' && (
          <>
            <Link to="/shop" className="nav-shop-btn">Shop Counter</Link>
            <Link to="/profile" className="nav-item">Shop Profile & Rates</Link>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;