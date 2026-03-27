import DriverLocation from '../models/driverLocation.model.js';
import Attendance from '../models/attendance.model.js';

// @desc    Update Driver Location (Live tracking ping)
// @route   POST /api/location/update
// @access  Private (Driver only)
export const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'GPS coordinates are required' });
    }

    // Only log if Driver is actively checked in
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeShift = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today },
      checkOutTime: { $exists: false }
    });

    if (!activeShift) {
      // Return 200 but ignore to prevent app crash, 
      // but ideally we inform the app so it can kill the background service.
      return res.status(403).json({ message: 'Not currently checked in.', stopTracking: true });
    }

    await DriverLocation.create({
      driver: req.user._id,
      location: { type: 'Point', coordinates: [lng, lat] }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Latest Location for Active Drivers
// @route   GET /api/location/active
// @access  Private (Admin only)
export const getActiveDriversLocations = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeShifts = await Attendance.find({
      date: { $gte: today },
      checkOutTime: { $exists: false },
      type: 'DRIVER'
    }).populate('user', 'name');

    const activeDriverIds = activeShifts.map(s => s.user._id);

    if (activeDriverIds.length === 0) {
      return res.json([]);
    }

    // Get the latest location for each active driver
    const locations = await DriverLocation.aggregate([
      { $match: { driver: { $in: activeDriverIds } } },
      { $sort: { timestamp: -1 } },
      { $group: {
          _id: '$driver',
          location: { $first: '$location' },
          lastUpdate: { $first: '$timestamp' }
      }}
    ]);

    const result = locations.map(loc => {
      const shift = activeShifts.find(s => s.user._id.toString() === loc._id.toString());
      return {
        driverId: loc._id,
        name: shift?.user?.name,
        lat: loc.location.coordinates[1],
        lng: loc.location.coordinates[0],
        lastUpdate: loc.lastUpdate,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
