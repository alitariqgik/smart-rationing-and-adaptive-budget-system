import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, ShoppingBasket, Sparkles, Leaf, Trash2, LogOut } from 'lucide-react';
import RecommendationModal from './RecommendationModal';

const Dashboard = ({ userId, onLogout }) => { // 1. Accept onLogout as a prop
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [showModal, setShowModal] = useState(false);

    const fetchCart = useCallback(async () => {
        if (!userId || userId === 'undefined' || userId === 'null') return;
        try {
            const res = await axios.get(`http://localhost:5000/api/cart/${userId}`);
            setCart(res.data);
        } catch (err) {
            console.error("❌ FETCH CART ERROR:", err.response?.data || err.message);
        }
    }, [userId]);

    useEffect(() => {
        if (userId && userId !== 'undefined') {
            fetchCart();
        }
    }, [userId, fetchCart]);

    const handleSearch = async (e) => {
        const val = e.target.value;
        setSearch(val);
        if (val.length > 2) {
            try {
                const res = await axios.get(`http://localhost:5000/api/products?search=${val}`);
                setProducts(res.data);
            } catch (err) {
                console.error("Search error:", err);
            }
        } else {
            setProducts([]);
        }
    };

    const addToCart = async (productId) => {
        try {
            await axios.post('http://localhost:5000/api/cart/add', { user_id: userId, product_id: productId });
            fetchCart();
        } catch (err) { console.error("Error adding to cart:", err); }
    };

    const removeFromCart = async (productId) => {
        try {
            await axios.delete('http://localhost:5000/api/cart/remove', {
                data: { user_id: userId, product_id: productId }
            });
            fetchCart();
        } catch (err) { console.error("Error removing item:", err); }
    };

    return (
        <div style={containerStyle}>
            {/* Header Section */}
            <div style={headerContainerStyle}>
                <div>
                    <h1 style={{ margin: 0, color: '#1e293b' }}>Grocery Dashboard</h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Welcome back, User #{userId}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setShowModal(true)} style={optimizeBtnStyle}>
                        <Sparkles size={18} /> Optimize Basket
                    </button>
                    {/* 2. Added Logout Button */}
                    <button onClick={onLogout} style={logoutBtnStyle} title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            <div style={layoutGridStyle}>
                {/* Search Panel */}
                <section>
                    <div style={searchBarContainer}>
                        <Search size={20} color="#94a3b8" />
                        <input 
                            type="text" 
                            placeholder="Search for groceries..." 
                            value={search} 
                            onChange={handleSearch}
                            style={inputStyle}
                        />
                    </div>
                    
                    <div style={{ marginTop: '20px' }}>
                        {products.map(p => (
                            <div key={p.id} style={productCardStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <img src={p.image_url || 'https://via.placeholder.com/60'} alt={p.name} style={imgStyle} />
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0 }}>{p.name}</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <p style={{ margin: '4px 0', color: '#64748b', fontWeight: '600' }}>£{p.price}</p>
                                            <span style={scoreBadgeStyle}><Leaf size={12} /> {p.nutrition_score}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => addToCart(p.id)} style={addBtnStyle}>Add</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Basket Sidebar */}
                <aside style={cartContainerStyle}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <ShoppingBasket color="#3b82f6" /> Your Basket
                    </h3>
                    <div style={cartListStyle}>
                        {cart.length === 0 ? (
                            <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '20px' }}>Empty basket</p>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} style={cartItemStyle}>
                                    <img src={item.image_url || 'https://via.placeholder.com/40'} alt={item.name} style={smallImgStyle} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>£{item.price}</div>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} style={removeBtnStyle}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <div style={totalContainerStyle}>
                        <span>Total:</span>
                        <span>£{cart.reduce((acc, curr) => acc + parseFloat(curr.price), 0).toFixed(2)}</span>
                    </div>
                </aside>
            </div>

            {showModal && (
                <RecommendationModal 
                    userId={userId} 
                    onClose={() => { setShowModal(false); fetchCart(); }} 
                />
            )}
        </div>
    );
};

// --- Styles ---
const containerStyle = { padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' };
const headerContainerStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' };
const layoutGridStyle = { display: 'grid', gridTemplateColumns: '1fr 350px', gap: '40px' };
const optimizeBtnStyle = { 
    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
    backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' 
};
const logoutBtnStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px',
    backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', cursor: 'pointer',
    transition: 'all 0.2s'
};
const searchBarContainer = { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', backgroundColor: '#f1f5f9', borderRadius: '12px' };
const inputStyle = { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '1rem' };
const productCardStyle = { padding: '15px', borderBottom: '1px solid #f1f5f9' };
const imgStyle = { width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' };
const smallImgStyle = { width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' };
const cartContainerStyle = { backgroundColor: '#f8fafc', padding: '24px', borderRadius: '20px', height: 'fit-content', border: '1px solid #e2e8f0' };
const cartListStyle = { maxHeight: '60vh', overflowY: 'auto' };
const cartItemStyle = { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' };
const addBtnStyle = { padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' };
const removeBtnStyle = { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' };
const scoreBadgeStyle = { fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '20px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' };
const totalContainerStyle = { marginTop: '20px', borderTop: '2px solid #e2e8f0', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.2rem' };

export default Dashboard;