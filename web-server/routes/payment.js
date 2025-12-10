const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const User = require('../models/User');
const PremiumRequest = require('../models/PremiumRequest');
const jwt = require('jsonwebtoken');

// Middleware to verify token
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

const Razorpay = require('razorpay');

// Initialize Razorpay


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_RoI79b29xp6b0N',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'AT5ZHmI9RU6ohktqPXb4OhIN'
});

const crypto = require('crypto');

// 1. Create Order Route
router.post('/create-order', auth, async (req, res) => {
    try {
        const options = {
            amount: 1000, // ₹10.00
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating order');
    }
});

// 1.5 Request Manual Access Route
router.post('/request-access', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Check availability
        const existing = await PremiumRequest.findOne({ userId: user.id, status: 'pending' });
        if (existing) {
            return res.status(200).json({ msg: 'Request already pending! Please check your email later.' });
        }

        const newRequest = new PremiumRequest({
            userId: user.id,
            email: user.email
        });
        await newRequest.save();

        // Send Email Notification
        // Send Email Notification
        let emailMsg = ' (Email sent to Admin)';

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: 'sngamic1@gmail.com',
                    subject: '🚀 New Premium Request - Interview Genie',
                    text: `User requested access:\n\nEmail: ${user.email}\nDate: ${new Date().toLocaleString()}\n\nGo to Admin Dashboard to activate.`
                });
                console.log('Email notification sent');
            } catch (emailErr) {
                console.error('Email failed:', emailErr);
                emailMsg = ' (Email Failed: ' + emailErr.message + ')';
            }
        } else {
            emailMsg = ' (Email Skipped: Config missing)';
        }

        res.json({ msg: 'Request saved!' + emailMsg });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// 2. Verify Payment Route
router.post('/verify-payment', auth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'AT5ZHmI9RU6ohktqPXb4OhIN')
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Success!
            let user = await User.findById(req.user.id);
            if (!user) return res.status(404).json({ msg: 'User not found' });

            user.isPremium = true;
            await user.save();

            res.json({ msg: 'Payment Verified', isPremium: true });
        } else {
            res.status(400).json({ msg: 'Invalid Signature' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Keep the old route just in case, or for manual checks if needed
router.post('/upgrade', auth, async (req, res) => {
    // ... (Old Logic if needed, or deprecate)
    // For now, let's just return error to force new flow
    res.status(400).json({ msg: 'Please use the Website Dashboard to upgrade.' });
});

module.exports = router;
