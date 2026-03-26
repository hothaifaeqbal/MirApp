import Attendance from '../models/attendance.model.js';

// Haversine formula to calculate distance between two coordinates in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const toRadians = deg => deg * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // in meters
};

// Hangar (Warehouse) Coordinates (to be replaced with actual coordinates from env)
// Example: Munich center
const HANGAR_LAT = parseFloat(process.env.HANGAR_LAT) || 48.137154;
const HANGAR_LNG = parseFloat(process.env.HANGAR_LNG) || 11.576124;
const MAX_ALLOWED_DISTANCE_METERS = 100;

// @desc    Check-in (Start Shift)
// @route   POST /api/attendance/check-in
// @access  Private (Warehouse / Driver)
export const checkIn = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
       return res.status(400).json({ message: 'GPS coordinates are required to check-in.' });
    }

    const distance = calculateDistance(lat, lng, HANGAR_LAT, HANGAR_LNG);

    if (distance > MAX_ALLOWED_DISTANCE_METERS) {
      return res.status(403).json({ 
        message: `Check-in denied. You are ${Math.round(distance)}m away from the Hangar. You must be within ${MAX_ALLOWED_DISTANCE_METERS}m.`
      });
    }

    // Check if already checked in today and not checked out
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today },
      checkOutTime: { $exists: false }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'You are already checked in.' });
    }

    const attendance = await Attendance.create({
      user: req.user._id,
      date: new Date(),
      checkInTime: new Date(),
      type: req.user.role === 'WAREHOUSE' ? 'WAREHOUSE' : 'DRIVER',
      checkInLocation: { lat, lng }
    });

    res.status(201).json(attendance);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check-out (End Shift)
// @route   POST /api/attendance/check-out
// @access  Private (Warehouse)
export const checkOut = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (req.user.role === 'DRIVER') {
       return res.status(400).json({ message: 'Drivers do not check out. They only check-in to start shift.' });
    }

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'GPS coordinates are required to check-out.' });
    }

    const distance = calculateDistance(lat, lng, HANGAR_LAT, HANGAR_LNG);

    if (distance > MAX_ALLOWED_DISTANCE_METERS) {
      return res.status(403).json({ 
        message: `Check-out denied. You are ${Math.round(distance)}m away from the Hangar. You must be within ${MAX_ALLOWED_DISTANCE_METERS}m.`
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today },
      checkOutTime: null
    });

    if (!attendance) {
      return res.status(404).json({ message: 'No active check-in found for today.' });
    }

    const checkoutTime = new Date();
    const totalHours = Math.abs(checkoutTime - attendance.checkInTime) / 36e5; // Convert ms to hours

    attendance.checkOutTime = checkoutTime;
    attendance.checkOutLocation = { lat, lng };
    attendance.totalHours = totalHours;

    await attendance.save();

    res.json(attendance);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
