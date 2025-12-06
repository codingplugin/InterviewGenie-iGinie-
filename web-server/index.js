require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve Website

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);

// Health Check (fallback if no static file found, though index.html usually takes precedence)
// app.get('/', (req, res) => {
//     res.send('Interview Genie Server is Running');
// });

// Connect to MongoDB
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env file');
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log('✅ Connected to MongoDB');
            app.listen(PORT, () => {
                console.log(`🚀 Server running on port ${PORT}`);
            });
        })
        .catch(err => {
            console.error('❌ MongoDB connection error:', err);
        });
}
