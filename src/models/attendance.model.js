import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkInTime: {
    type: Date,
    required: true
  },
  checkOutTime: {
    type: Date
  },
  type: {
    type: String,
    enum: ['WAREHOUSE', 'DRIVER'],
    required: true
  },
  // GPS Coordinates when checking in/out
  checkInLocation: {
    lat: Number,
    lng: Number
  },
  checkOutLocation: {
    lat: Number,
    lng: Number
  },
  totalHours: {
    type: Number, // Calculated on checkout for WAREHOUSE only
    default: 0
  }
}, {
  timestamps: true
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
