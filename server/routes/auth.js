const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const twilio = require('twilio');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'manager' } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'Email already registered.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = new User({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      role
    });
    
    await user.save();

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'biosecurity_secret', { expiresIn: '24h' });
    
    const { password: _, ...userWithoutPassword } = user.toJSON();
    res.status(201).json({ user: userWithoutPassword, token, message: 'Account created successfully.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'biosecurity_secret', { expiresIn: '24h' });
    const { password: _, ...userWithoutPassword } = user.toJSON();
    
    res.json({ user: userWithoutPassword, token, message: 'Login successful.' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, currentPassword, newPassword, avatar } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (name) user.name = name.trim();
    if (avatar !== undefined) user.avatar = avatar;

    if (currentPassword && newPassword) {
      if (!user.password) {
        // If user registered with phone or social, they don't have a password yet. Let's let them set it.
        if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        user.password = await bcrypt.hash(newPassword, 12);
      } else {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect.' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        user.password = await bcrypt.hash(newPassword, 12);
      }
    }
    
    await user.save();
    
    const { password: _, ...updatedUser } = user.toJSON();
    res.json({ user: updatedUser, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/social-login
router.post('/social-login', async (req, res) => {
  try {
    const { email: providedEmail, name: providedName, avatar: providedAvatar, provider, token: socialToken } = req.body;

    let email = providedEmail;
    let name = providedName;
    let avatar = providedAvatar;

    // Real API Validation
    if (socialToken) {
      if (provider === 'Google') {
        const hasClientId = !!process.env.VITE_GOOGLE_CLIENT_ID;
        if (hasClientId) {
          try {
            const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${socialToken}`);
            if (!googleRes.ok) {
              const errTxt = await googleRes.text();
              console.error('Google verification returned status', googleRes.status, errTxt);
              return res.status(400).json({ error: 'Failed to verify Google access token' });
            }
            const googleData = await googleRes.json();
            email = googleData.email;
            name = googleData.name || googleData.given_name || 'Google User';
            avatar = googleData.picture || googleData.avatar;
          } catch (err) {
            console.error('Error fetching Google userinfo:', err);
            return res.status(400).json({ error: 'Google verification failed' });
          }
        } else {
          console.warn('[Social Auth] Google Client ID is not configured. Falling back to mock details.');
        }
      } else if (provider === 'Facebook') {
        const hasAppId = !!process.env.VITE_FACEBOOK_APP_ID;
        if (hasAppId) {
          try {
            const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${socialToken}`);
            if (!fbRes.ok) {
              const errTxt = await fbRes.text();
              console.error('Facebook verification returned status', fbRes.status, errTxt);
              return res.status(400).json({ error: 'Failed to verify Facebook access token' });
            }
            const fbData = await fbRes.json();
            email = fbData.email || `${fbData.id}@facebook.com`;
            name = fbData.name || 'Facebook User';
            avatar = fbData.picture?.data?.url || fbData.avatar;
          } catch (err) {
            console.error('Error fetching Facebook data:', err);
            return res.status(400).json({ error: 'Facebook verification failed' });
          }
        } else {
          console.warn('[Social Auth] Facebook App ID is not configured. Falling back to mock details.');
        }
      }
    }

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and Name are required for social login.' });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      // Create new social user
      user = new User({
        email: email.toLowerCase().trim(),
        name: name.trim(),
        avatar: avatar || null,
        role: 'manager'
      });
      await user.save();
    } else {
      let isModified = false;
      if (avatar && !user.avatar) {
        user.avatar = avatar;
        isModified = true;
      }
      if (isModified) {
        await user.save();
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email || '' },
      process.env.JWT_SECRET || 'biosecurity_secret',
      { expiresIn: '24h' }
    );

    const userJson = user.toJSON();
    if (userJson.password) delete userJson.password;

    res.json({
      user: userJson,
      token,
      message: `Successfully signed in with ${provider || 'social account'}.`
    });
  } catch (err) {
    console.error('Social login error:', err);
    res.status(500).json({ error: 'Social login processing failed.' });
  }
});

// POST /api/auth/phone-login
router.post('/phone-login', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

    const cleanPhone = phone.trim();
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    const isTwilioConfigured = twilioSid && twilioToken && twilioFrom;
    
    // Generate secure 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (isTwilioConfigured) {
      try {
        // Store in MongoDB under OTP model
        await OTP.findOneAndUpdate(
          { phone: cleanPhone },
          { code, created_at: new Date() },
          { upsert: true, new: true }
        );

        // Dispatch via real Twilio SDK
        const client = twilio(twilioSid, twilioToken);
        await client.messages.create({
          body: `🌾 Your FarmGuard verification code is: ${code}. Valid for 5 minutes.`,
          from: twilioFrom,
          to: cleanPhone
        });

        console.log(`[Twilio SMS] Real verification code dispatched to ${cleanPhone}`);

        res.json({
          success: true,
          message: 'A 6-digit verification code has been sent to your phone number via Twilio SMS.',
          isMock: false
        });
      } catch (smsErr) {
        console.error('Twilio SMS sending failed:', smsErr);
        return res.status(500).json({ error: `Twilio SMS failed: ${smsErr.message}` });
      }
    } else {
      console.warn(`[SMS OTP Fallback] Twilio is not configured. Using simulated SMS code 123456 for ${cleanPhone}`);
      
      // Store standard simulated code in database so verification path remains unified
      await OTP.findOneAndUpdate(
        { phone: cleanPhone },
        { code: '123456', created_at: new Date() },
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        message: 'FarmGuard is running in simulation mode. A 6-digit code has been sent. Use code 123456.',
        otp: '123456', // Returned for easier frontend testing when credentials are not configured
        isMock: true
      });
    }
  } catch (err) {
    console.error('Phone login init error:', err);
    res.status(500).json({ error: 'Failed to initiate phone login.' });
  }
});

// POST /api/auth/phone-otp
router.post('/phone-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone number and verification code are required.' });

    const cleanPhone = phone.trim();
    const cleanOtp = otp.trim();

    // Query database for stored OTP code
    const otpRecord = await OTP.findOne({ phone: cleanPhone, code: cleanOtp });
    
    // If not found in DB, we check if it is simulated mock setup
    const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
    
    if (!otpRecord) {
      if (!twilioConfigured && cleanOtp === '123456') {
        // Allow mock bypass
        console.log(`[SMS OTP Bypass] Allowing bypass for mock code 123456 on ${cleanPhone}`);
      } else {
        return res.status(400).json({ error: 'Invalid or expired verification code.' });
      }
    } else {
      // Remove verified code from database
      await OTP.deleteOne({ _id: otpRecord._id });
    }

    let user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      // Create new phone user
      const lastDigits = cleanPhone.slice(-4);
      user = new User({
        phone: cleanPhone,
        name: `Farmer ${lastDigits}`,
        role: 'manager'
      });
      await user.save();
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      process.env.JWT_SECRET || 'biosecurity_secret',
      { expiresIn: '24h' }
    );

    const userJson = user.toJSON();
    if (userJson.password) delete userJson.password;

    res.json({
      user: userJson,
      token,
      message: 'Phone verified successfully.'
    });
  } catch (err) {
    console.error('Phone OTP verify error:', err);
    res.status(500).json({ error: 'Failed to verify phone OTP.' });
  }
});

// GET /api/auth/users (admin only)
router.get('/users', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
    const users = await User.find().select('-password').sort({ created_at: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

module.exports = router;
