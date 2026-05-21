import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, ArrowRight, Check, TrendingDown, Leaf, Trash2 } from 'lucide-react';

const RecommendationModal = ({ userId, onClose }) => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecs = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`http://localhost:5000/api/recommendations/${userId}`);
                setRecommendations(res.data);
            } catch (err) {
                console.error("Error fetching recs", err);
            } finally {
                setLoading(false);
            }
        };
        if (userId) fetchRecs();
    }, [userId]);

    const handleSwap = async (oldId, newId) => {
        try {
            await axios.post('http://localhost:5000/api/recommendations/accept', { user_id: userId, old_product_id: oldId, new_product_id: newId });
            setRecommendations(prev => prev.filter(r => r.original_id !== oldId));
        } catch (err) { alert("Error swapping items."); }
    };

    const handleReject = async (oldId, newId) => {
        try {
            await axios.post('http://localhost:5000/api/recommendations/reject', { user_id: userId, old_product_id: oldId, new_product_id: newId });
            setRecommendations(prev => prev.filter(r => !(r.original_id === oldId && r.recommended_id === newId)));
        } catch (err) { console.error("Error rejecting", err); }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <header style={headerStyle}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><TrendingDown color="#27ae60" /> Smart Swaps</h2>
                    <button onClick={onClose} style={closeBtnStyle}><X size={24} /></button>
                </header>

                <div style={listStyle}>
                    {recommendations.map((rec) => (
                        <div key={`${rec.original_id}-${rec.recommended_id}`} style={cardStyle}>
                            {/* Current Item */}
                            <div style={itemBoxStyle}>
                                <span style={tagStyle}>Current</span>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <img src={rec.orig_image || 'placeholder.png'} style={compImgStyle} alt="original" />
                                    <div>
                                        <div style={nameStyle}>{rec.original_name}</div>
                                        <div style={scoreStyle}><Leaf size={12} /> {rec.orig_score}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={connectorStyle}><ArrowRight color="#bdc3c7" /></div>

                            {/* Better Choice */}
                            <div style={{ ...itemBoxStyle, borderLeft: '3px solid #27ae60', paddingLeft: '15px' }}>
                                <span style={{ ...tagStyle, backgroundColor: '#27ae60' }}>Better</span>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <img src={rec.alt_image || 'placeholder.png'} style={compImgStyle} alt="recommended" />
                                    <div>
                                        <div style={nameStyle}>{rec.recommended_name}</div>
                                        <div style={{ ...scoreStyle, color: '#27ae60' }}><Leaf size={12} /> {rec.alt_score}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleReject(rec.original_id, rec.recommended_id)} style={rejectBtnStyle}><Trash2 size={16} /></button>
                                <button onClick={() => handleSwap(rec.original_id, rec.recommended_id)} style={swapBtnStyle}><Check size={16} /> Swap</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#fff', width: '90%', maxWidth: '850px', borderRadius: '20px', padding: '30px', maxHeight: '80vh', overflowY: 'auto' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' };
const cardStyle = { display: 'grid', gridTemplateColumns: '1fr 40px 1fr auto', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid #eee', borderRadius: '12px', marginBottom: '10px' };
const itemBoxStyle = { display: 'flex', flexDirection: 'column', gap: '5px' };
const compImgStyle = { width: '50px', height: '50px', objectFit: 'cover', borderRadius: '6px' };
const nameStyle = { fontWeight: 'bold', fontSize: '0.9rem' };
const tagStyle = { fontSize: '10px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' };
const scoreStyle = { fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' };
const connectorStyle = { display: 'flex', justifyContent: 'center' };
const swapBtnStyle = { display: 'flex', alignItems: 'center', gap: '5px', padding: '10px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
const rejectBtnStyle = { padding: '10px', border: '1px solid #e74c3c', color: '#e74c3c', background: 'none', borderRadius: '8px', cursor: 'pointer' };
const listStyle = { display: 'flex', flexDirection: 'column' };
const closeBtnStyle = { border: 'none', background: 'none', cursor: 'pointer' };

export default RecommendationModal;