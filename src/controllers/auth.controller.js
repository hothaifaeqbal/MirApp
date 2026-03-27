import User from '../models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (Pending status by default)
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const { name, password, role, deviceId } = req.body;

    if (!name || !password || !role || !deviceId) {
      return res.status(400).json({ message: 'Please add all fields, including deviceId' });
    }

    // Check if user or device already exists
    const deviceExists = await User.findOne({ deviceId });
    if (deviceExists) {
      return res.status(400).json({ message: 'Device is already bound to another account. No multi-device allowed.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with PENDING status
    const user = await User.create({
      name,
      password: hashedPassword,
      role,
      deviceId,
      status: 'PENDING'
    });

    if (user) {
      res.status(201).json({
        message: 'Registration successful! Your account is PENDING approval from the Admin.',
        _id: user.id,
        name: user.name,
        role: user.role,
        status: user.status
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login for users with Activation Code & correct Device ID
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { activationCode, deviceId, password } = req.body;

    if (!activationCode || !deviceId || !password) {
        return res.status(400).json({ message: 'Activation code, deviceId, and password are required.' });
    }

    // Find the user by activation code (support both String and Number in DB)
    const user = await User.findOne({ activationCode: { $in: [activationCode, Number(activationCode)] } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid activation code' });
    }

    // 1. Check Status
    if (user.status !== 'APPROVED') {
      return res.status(403).json({ message: `Account is ${user.status}. Please contact Admin.` });
    }

    // 2. Check Device ID (Digital Cage)
    // Admin accounts with ADMIN_UNBOUND can bind to the first device that logs in
    if (user.deviceId === 'ADMIN_UNBOUND') {
      user.deviceId = deviceId;
      await user.save();
    } else if (user.deviceId !== deviceId) {
      return res.status(403).json({ message: 'Login denied: This account is bound to a different device.' });
    }

    // 3. Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({
      _id: user.id,
      name: user.name,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Direct login for ADMIN users using password only (no activation code)
// @route   POST /api/auth/admin-login
export const adminDirectLogin = async (req, res) => {
  try {
    const { name, password, deviceId } = req.body;

    if (!name || !password || !deviceId) {
      return res.status(400).json({ message: 'Name, password and deviceId are required.' });
    }

    // Find the user by name and require ADMIN role + APPROVED status
    const user = await User.findOne({ name, role: 'ADMIN', status: 'APPROVED' });

    if (!user) {
      return res.status(401).json({ message: 'No approved Admin account found with this name.' });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update deviceId binding to the current device (first-time admin setup)
    if (user.deviceId !== deviceId) {
      user.deviceId = deviceId;
      await user.save();
    }

    res.json({
      _id: user.id,
      name: user.name,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
