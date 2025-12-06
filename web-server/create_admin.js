require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const adminEmail = 'sngamic1@gmail.com';
const adminPass = 'Subhradip@1';

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        let user = await User.findOne({ email: adminEmail });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPass, salt);

        if (user) {
            user.password = hashedPassword;
            user.isPremium = true;
            await user.save();
            console.log('✅ Admin user updated with Premium access');
        } else {
            user = new User({
                email: adminEmail,
                password: hashedPassword,
                isPremium: true
            });
            await user.save();
            console.log('✅ Admin user created with Premium access');
        }

        mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

createAdmin();
