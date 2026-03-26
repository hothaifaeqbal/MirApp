import Tur from '../models/tur.model.js';

// @desc    Assign packages to Driver (Create Tur)
// @route   POST /api/logistics/turs
// @access  Private (Admin / Warehouse)
export const createTur = async (req, res) => {
  try {
    const { driverId, totalPackagesTaken } = req.body;

    if (!driverId || totalPackagesTaken === undefined) {
      return res.status(400).json({ message: 'Driver ID and total packages taken are required.' });
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'WAREHOUSE') {
      return res.status(403).json({ message: 'Only Admins or Warehouse workers can assign packages.' });
    }

    const tur = await Tur.create({
      driver: driverId,
      createdBy: req.user._id,
      date: new Date(),
      totalPackagesTaken,
      status: 'IN_PROGRESS'
    });

    res.status(201).json(tur);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Tur (Input Returns)
// @route   PUT /api/logistics/turs/:id
// @access  Private (Driver / Admin / Warehouse)
export const updateTurReturns = async (req, res) => {
  try {
    const { returns, status } = req.body;

    const tur = await Tur.findById(req.params.id);

    if (!tur) {
      return res.status(404).json({ message: 'Tur not found' });
    }

    // Driver can only update their own Tur
    if (req.user.role === 'DRIVER' && tur.driver.toString() !== req.user._id.toString()) {
       return res.status(403).json({ message: 'You can only update your own Turs.' });
    }

    if (returns !== undefined) tur.returns = returns;
    if (status !== undefined) tur.status = status;

    await tur.save(); // pre-save hook will calculate deliveredPackages

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
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json(turs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
