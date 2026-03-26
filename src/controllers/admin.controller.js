import User from '../models/user.model.js';
import crypto from 'crypto';

// @desc    Get all users (Filter by status optional)
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    const statusFilter = req.query.status;
    const query = statusFilter ? { status: statusFilter } : {};
    
    // Exclude passwords
    const users = await User.find(query).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a pending user
// @route   PUT /api/admin/users/:id/approve
// @access  Private/Admin
export const approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status === 'APPROVED') {
      return res.status(400).json({ message: 'User is already approved' });
    }

    // Generate a random 6-character alphanumeric activation code
    const activationCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    user.status = 'APPROVED';
    user.activationCode = activationCode;

    await user.save();

    res.json({
      message: 'User approved successfully',
      activationCode: activationCode,
      note: 'Send this code out-of-band to the user so they can login.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Lock a user account
// @route   PUT /api/admin/users/:id/lock
// @access  Private/Admin
export const lockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'LOCKED';
    // Clear activation code so they can't log back in if it was cached
    user.activationCode = null;

    await user.save();

    res.json({ message: 'User locked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
