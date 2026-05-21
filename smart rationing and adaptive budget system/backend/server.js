const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Auth Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 2. Product Search
app.get('/api/products', async (req, res) => {
    const { search } = req.query;
    try {
        const products = await pool.query(
            "SELECT id, name, price, nutrition_score, image_url FROM products WHERE name ILIKE $1 LIMIT 50", 
            [`%${search || ''}%`]
        );
        res.json(products.rows);
    } catch (err) {
        console.error("❌ SEARCH ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 3. Add to Cart
app.post('/api/cart/add', async (req, res) => {
    const { user_id, product_id } = req.body;
    try {
        await pool.query(
            "INSERT INTO shopping_lists (user_id, product_id) VALUES ($1, $2)",
            [user_id, product_id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("❌ ADD TO CART ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Recommendations
app.get('/api/recommendations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT 
                r.original_product_id AS original_id,
                p1.name AS original_name,
                p1.price AS orig_price,
                p1.nutrition_score AS orig_score,
                p1.image_url AS orig_image, -- Check this name
                r.recommended_product_id AS recommended_id,
                p2.name AS recommended_name,
                p2.price AS alt_price,
                p2.nutrition_score AS alt_score,
                p2.image_url AS alt_image, -- Check this name
                ROUND((p1.price - p2.price)::numeric, 2) AS savings
            FROM get_recommendations($1) r
            JOIN products p1 ON r.original_product_id = p1.id
            JOIN products p2 ON r.recommended_product_id = p2.id;
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ RECOMMENDATION SQL ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// 5. Accept/Swap Recommendation
app.post('/api/recommendations/accept', async (req, res) => {
    const { user_id, old_product_id, new_product_id } = req.body;
    try {
        await pool.query("CALL accept_recommendation($1, $2, $3)", [user_id, old_product_id, new_product_id]);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ ACCEPT RECOMMENDATION ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 6. Fetch Cart
app.get('/api/cart/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const cartItems = await pool.query(
            "SELECT p.id, p.name, p.price, p.image_url, p.nutrition_score FROM products p JOIN shopping_lists sl ON p.id = sl.product_id WHERE sl.user_id = $1",
            [userId]
        );
        res.json(cartItems.rows);
    } catch (err) {
        console.error("❌ FETCH CART ERROR:", err.message); // Look for this in terminal!
        res.status(500).json({ error: err.message });
    }
});

// 7. Reject Recommendation
app.post('/api/recommendations/reject', async (req, res) => {
    const { user_id, old_product_id, new_product_id } = req.body;
    try {
        await pool.query(
            "UPDATE recommendations SET status = 'rejected' WHERE user_id = $1 AND original_product_id = $2 AND recommended_product_id = $3",
            [user_id, old_product_id, new_product_id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("❌ REJECT RECOMMENDATION ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 8. Remove from Cart
app.delete('/api/cart/remove', async (req, res) => {
    const { user_id, product_id } = req.body;
    try {
        // We use LIMIT 1 in a subquery or simply delete the match 
        // to remove one instance of that product from the user's list
        await pool.query(
            "DELETE FROM shopping_lists WHERE id IN (SELECT id FROM shopping_lists WHERE user_id = $1 AND product_id = $2 LIMIT 1)",
            [user_id, product_id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("❌ REMOVE FROM CART ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));