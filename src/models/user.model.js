import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['ADMIN', 'WAREHOUSE', 'DRIVER'], 
    required: true 
  },
  deviceId: { 
    type: String, 
    required: true,
    unique: true  // Device ID can only be registered once effectively
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'LOCKED'], 
    default: 'PENDING' 
  },
  activationCode: { 
    type: String, // Nullable, populated when Admin approves
    default: null
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);
export default User;
