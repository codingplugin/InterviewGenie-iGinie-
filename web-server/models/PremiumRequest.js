const mongoose = require('mongoose');

const PremiumRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: { type: String, required: true },
    status: { type: String, default: 'pending', enum: ['pending', 'completed'] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PremiumRequest', PremiumRequestSchema);
