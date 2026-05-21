import React, { useState } from 'react';
import axios from 'axios';

const AuthPage = ({ setUser }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        try {
            const res = await axios.post(`http://localhost:5000/api${endpoint}`, formData);
            if (isLogin) {
                localStorage.setItem('token', res.data.token);
                setUser(res.data.user);
                alert(`Welcome back, ${res.data.user.username}!`);
            } else {
                alert("Registration successful! Please log in.");
                setIsLogin(true);
            }
        } catch (err) {
            alert("Error: " + err.response.data);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc' }}>
            <h2>{isLogin ? 'Login' : 'Create Account'}</h2>
            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <input type="text" placeholder="Username" required
                        onChange={e => setFormData({...formData, username: e.target.value})} />
                )}
                <input type="email" placeholder="Email" required
                    onChange={e => setFormData({...formData, email: e.target.value})} />
                <input type="password" placeholder="Password" required
                    onChange={e => setFormData({...formData, password: e.target.value})} />
                <button type="submit">{isLogin ? 'Login' : 'Sign Up'}</button>
            </form>
            <p onClick={() => setIsLogin(!isLogin)} style={{ cursor: 'pointer', color: 'blue' }}>
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
            </p>
        </div>
    );
};

export default AuthPage;