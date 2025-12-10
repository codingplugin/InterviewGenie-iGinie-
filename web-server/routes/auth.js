const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PremiumRequest = require('../models/PremiumRequest');

const validator = require('validator');

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate Email
        if (!validator.isEmail(email)) {
            return res.status(400).json({ msg: 'Please enter a valid email address' });
        }

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        user = new User({
            email,
            password: hashedPassword
        });

        await user.save();

        // Create Token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '30d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    isPremium: user.isPremium,
                    user: {
                        id: user.id,
                        email: user.email,
                        isPremium: user.isPremium
                    }
                });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Create Token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '30d' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    isPremium: user.isPremium,
                    user: {
                        id: user.id,
                        email: user.email,
                        isPremium: user.isPremium
                    }
                });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get User Data
router.get('/me', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const user = await User.findById(decoded.user.id).select('-password');

        if (!user) {
            return res.status(401).json({ msg: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
});

const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '1006736129206-nuusm1qrqbhnuaf2nvk4h0q26g1270nq.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

// Google Login
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID
        });
        const { email, sub, picture } = ticket.getPayload(); // sub is googleId

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create new user (Generate random password for internal consistency)
            const randomPassword = Math.random().toString(36).slice(-8);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(randomPassword, salt);

            user = new User({
                email,
                password: hashedPassword,
                googleId: sub,
                // picture: picture 
            });
            await user.save();
        }

        // Create JWT Token
        const payload = { user: { id: user.id } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '30d' },
            (err, authToken) => {
                if (err) throw err;
                // Return picture in the response so frontend can store it
                res.json({
                    token: authToken,
                    isPremium: user.isPremium,
                    user: {
                        email: user.email,
                        isPremium: user.isPremium,
                        picture: picture // Send Google Photo URL
                    }
                });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(400).send('Google Auth Failed');
    }
});

// Admin: Activate Premium
router.post('/admin/activate', async (req, res) => {
    const ADMIN_EMAIL = 'sngamic1@gmail.com';

    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const adminUser = await User.findById(decoded.user.id);

        if (!adminUser || adminUser.email !== ADMIN_EMAIL) {
            return res.status(403).json({ msg: 'Access Denied: Admin only' });
        }

        const { email } = req.body;
        if (!email) return res.status(400).json({ msg: 'Email is required' });

        let user = await User.findOne({ email });

        if (!user) {
            // Option: Create the user if they don't exist? 
            // Better to only allow activating existing users for now to avoid password issues
            // Or create with dummy password. Let's return not found for safety.
            return res.status(404).json({ msg: 'User not found. Please ask them to Register first.' });
        }

        user.isPremium = true;
        await user.save();

        res.json({ msg: `Premium activated for ${email}` });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Admin: Get Requests
router.get('/admin/requests', async (req, res) => {
    const ADMIN_EMAIL = 'sngamic1@gmail.com';
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: 'No token' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const adminUser = await User.findById(decoded.user.id);

        if (!adminUser || adminUser.email !== ADMIN_EMAIL) {
            return res.status(403).json({ msg: 'Access Denied' });
        }

        const requests = await PremiumRequest.find({ status: 'pending' }).sort({ createdAt: -1 });
        res.json(requests);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update Password (for Google Users or Password Reset)
router.put('/update-password', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        const userId = decoded.user.id;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ msg: 'Password must be at least 6 characters' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        res.json({ msg: 'Password updated successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
