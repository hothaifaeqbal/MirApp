import Tur from '../models/tur.model.js';

// @desc    Assign packages to Driver (Create Tur)
// @route   POST /api/logistics/turs
// @access  Private (Admin / Warehouse)
export const createTur = async (req, res) => {
  try {
    const { driverId, manualDeliveredCount, manualReturnedCount, ratePerPackage, packages } = req.body;

    if (!driverId) {
      return res.status(400).json({ message: 'Driver ID is required.' });
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'WAREHOUSE') {
      return res.status(403).json({ message: 'Only Admins or Warehouse workers can assign packages.' });
    }

    // Check if the driver already has an active Tur today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingTur = await Tur.findOne({
      driver: driverId,
      date: { $gte: today },
      status: 'ACTIVE'
    });

    if (existingTur) {
      return res.status(400).json({ message: 'Driver already has an Active Tur today.' });
    }

    const tur = await Tur.create({
      driver: driverId,
      date: new Date(),
      manualDeliveredCount: manualDeliveredCount || 0,
      manualReturnedCount: manualReturnedCount || 0,
      ratePerPackage: ratePerPackage || 0.50,
      packages: packages || [],
      status: 'ACTIVE'
    });

    res.status(201).json(tur);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Tur (Manual Counts or Status)
// @route   PUT /api/logistics/turs/:id
// @access  Private (Driver / Admin / Warehouse)
export const updateTur = async (req, res) => {
  try {
    const { manualDeliveredCount, manualReturnedCount, status } = req.body;

    const tur = await Tur.findById(req.params.id);

    if (!tur) {
      return res.status(404).json({ message: 'Tur not found' });
    }

    // Driver can only update their own Tur
    if (req.user.role === 'DRIVER' && tur.driver.toString() !== req.user._id.toString()) {
       return res.status(403).json({ message: 'You can only update your own Turs.' });
    }

    if (manualDeliveredCount !== undefined) tur.manualDeliveredCount = manualDeliveredCount;
    if (manualReturnedCount !== undefined) tur.manualReturnedCount = manualReturnedCount;
    if (status !== undefined) tur.status = status;

    await tur.save();

    res.json(tur);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all Turs
// @route   GET /api/logistics/turs
// @access  Private
export const getTurs = async (req, res) => {
  try {
    let query = {};
    
    // Drivers only see their own turs
    if (req.user.role === 'DRIVER') {
      query.driver = req.user._id;
    }

    const turs = await Tur.find(query)
      .populate('driver', 'name')
      .sort({ createdAt: -1 });

    res.json(turs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
