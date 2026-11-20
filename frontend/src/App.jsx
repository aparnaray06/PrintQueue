import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import StudentOrderPage from './pages/StudentOrderPage.jsx';
import TrackOrderPage from './pages/TrackOrderPage.jsx';
import ShopDashboardPage from './pages/ShopDashboardPage.jsx';

function App() {
  return (
    <Router>
      <div className="app-shell">
        <Navbar />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<StudentOrderPage />} />
          <Route path="/track" element={<TrackOrderPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/shop" element={<ShopDashboardPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;