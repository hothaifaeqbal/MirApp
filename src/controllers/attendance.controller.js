import Attendance from '../models/attendance.model.js';
import User from '../models/user.model.js';
import crypto from 'crypto';

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

// @desc    Kiosk Scan (QR Code HMAC Check-in/Out)
// @route   POST /api/attendance/kiosk-scan
// @access  Private (Admin only)
export const kioskScan = async (req, res) => {
  try {
    const { payload } = req.body;
    if (!payload) return res.status(400).json({ message: 'QR Payload missing.' });

    let data;
    try {
      data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (e) {
      return res.status(400).json({ message: 'Invalid QR format.' });
    }

    const { userId, timestamp, signature } = data;

    // Verify HMAC
    const _secret = 'HERMES_LOGISTICS_SECRET_2026_SECURE_QR';
    const expectedPayload = `${userId}:${timestamp}`;
    const hmacSha256 = crypto.createHmac('sha256', _secret);
    const expectedSignature = hmacSha256.update(expectedPayload).digest('hex');

    if (signature !== expectedSignature) {
      return res.status(403).json({ message: 'هذا الـ QR مزور أو تم التلاعب به!' });
    }

    // Verify window (60 seconds) with a 60s grace period
    const now = Math.floor(Date.now() / 1000);
    const window = now - (now % 60);
    if (timestamp !== window && timestamp !== (window - 60)) {
      return res.status(403).json({ message: 'هذا الرمز منتهي الصلاحية، يرجى تحديث التطبيق!' });
    }

    // Find Worker
    const worker = await User.findById(userId);
    if (!worker) return res.status(404).json({ message: 'لم يتم العثور على الموظف!' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
      user: worker._id,
      date: { $gte: today }
    });

    if (!existingAttendance) {
      // Clock IN
      await Attendance.create({
        user: worker._id,
        date: new Date(),
        checkInTime: new Date(),
        type: worker.role,
        checkInLocation: { lat: HANGAR_LAT, lng: HANGAR_LNG }
      });
      return res.json({ message: `${worker.name}\nتم تسجيل الدخول لبدء الوردية.` });
    } else if (!existingAttendance.checkOutTime) {
      // Clock OUT
      if (worker.role === 'DRIVER') {
        return res.status(400).json({ message: `السائق ${worker.name} مسجل مسبقاً. إنهاء الوردية يتم من هاتف السائق حصراً.` });
      }

      existingAttendance.checkOutTime = new Date();
      existingAttendance.checkOutLocation = { lat: HANGAR_LAT, lng: HANGAR_LNG };
      const hours = Math.abs(existingAttendance.checkOutTime - existingAttendance.checkInTime) / 36e5;
      existingAttendance.totalHours = hours;
      await existingAttendance.save();
      
      return res.json({ message: `${worker.name}\nتم تسجيل الخروج وإنهاء الوردية.` });
    } else {
      return res.status(400).json({ message: `الموظف ${worker.name} أتم ورديته مسبقاً اليوم!` });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

