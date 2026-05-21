import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // To prevent flickering on refresh

  // 1. Check localStorage when the app first loads
  useEffect(() => {
    const savedUser = localStorage.getItem('srabs_user');
    if (savedUser && savedUser !== 'undefined') {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Session recovery failed");
        localStorage.removeItem('srabs_user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // 2. Save user object to localStorage so it survives refresh
    localStorage.setItem('srabs_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('srabs_user'); // Clean up session
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading session...</div>;

  return (
    <div className="App">
      {!user ? (
        <Auth onLogin={handleLogin} />
      ) : (
        /* Passing user.id clearly to the Dashboard */
        <Dashboard userId={user.id} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;