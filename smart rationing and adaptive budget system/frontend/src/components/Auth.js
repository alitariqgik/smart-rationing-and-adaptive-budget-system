import React, { useState } from 'react';
import axios from 'axios';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleAction = async (e) => {
    e.preventDefault();
    const url = isLogin ? '/auth/login' : '/auth/register';
    const payload = isLogin ? { email, password } : { username, email, password };

    try {
      const { data } = await axios.post(`http://localhost:5000/api${url}`, payload);
      
      if (isLogin) {
        localStorage.setItem('token', data.token); 
        
        // Ensure data.user exists and contains the database ID
        if (data.user) {
          onLogin(data.user);
        } else {
          alert("Login successful but user data missing.");
        }
      } else {
        alert("Account created! Now please log in.");
        setIsLogin(true);
      }
    } catch (err) {
      alert(err.response?.data?.error || "An error occurred");
    }
  };

  return (
    <div className="auth-container" style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#1e293b' }}>{isLogin ? "Login to SRABS" : "Join SRABS"}</h2>
      <form onSubmit={handleAction} style={formBoxStyle}>
        {!isLogin && (
          <div style={inputWrapper}>
            <input 
              type="text" 
              placeholder="Username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              style={inputStyle}
              required 
            />
          </div>
        )}
        <div style={inputWrapper}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            style={inputStyle}
            required 
          />
        </div>
        <div style={inputWrapper}>
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            style={inputStyle}
            required 
          />
        </div>
        <button type="submit" style={btnStyle}>
          {isLogin ? "Login" : "Sign Up"}
        </button>
      </form>
      <p 
        onClick={() => setIsLogin(!isLogin)} 
        style={{ cursor: 'pointer', color: '#3b82f6', marginTop: '15px', fontSize: '0.9rem' }}
      >
        {isLogin ? "Need an account? Sign up" : "Have an account? Login"}
      </p>
    </div>
  );
};

// Simple inline styles to match your dashboard look
const formBoxStyle = { 
  display: 'inline-block', 
  padding: '30px', 
  border: '1px solid #e2e8f0', 
  borderRadius: '12px', 
  backgroundColor: '#fff',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' 
};

const inputWrapper = { marginBottom: '15px' };

const inputStyle = { 
  padding: '10px', 
  width: '250px', 
  borderRadius: '6px', 
  border: '1px solid #cbd5e1',
  outline: 'none' 
};

const btnStyle = { 
  width: '100%', 
  padding: '10px', 
  backgroundColor: '#3b82f6', 
  color: 'white', 
  border: 'none', 
  borderRadius: '6px', 
  fontWeight: 'bold', 
  cursor: 'pointer' 
};

export default Auth;