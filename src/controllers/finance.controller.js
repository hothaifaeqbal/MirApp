import Expense from '../models/expense.model.js';
import Attendance from '../models/attendance.model.js';
import Tur from '../models/tur.model.js';
import User from '../models/user.model.js';
import SalarySlip from '../models/salarySlip.model.js';

// @desc    Add a Fleet/Misc Expense
// @route   POST /api/finance/expenses
// @access  Private (Admin)
export const addExpense = async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;

    const expense = await Expense.create({
      category,
      amount,
      description,
      date: date || new Date(),
      createdBy: req.user._id
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get All Expenses
// @route   GET /api/finance/expenses
// @access  Private (Admin)
export const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().populate('createdBy', 'name');
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a Salary Slip (Draft)
// @route   POST /api/finance/salary
// @access  Private (Admin)
export const createSalarySlip = async (req, res) => {
  try {
    const { userId, month, year, hourlyRate, pieceRate, bonuses, bonusReason, deductions, deductionReason } = req.body;

    if (!userId || !month || !year) {
      return res.status(400).json({ message: 'User ID, month, and year are required.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let totalHours = 0;
    let totalDelivered = 0;
    let totalPay = 0;

    // Get first and last day of month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    if (user.role === 'WAREHOUSE') {
      const attendances = await Attendance.find({
        user: userId,
        date: { $gte: startDate, $lte: endDate }
      });
      totalHours = attendances.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
      totalPay = totalHours * (hourlyRate || 0);

    } else if (user.role === 'DRIVER') {
      const turs = await Tur.find({
        driver: userId,
        date: { $gte: startDate, $lte: endDate }
      });
      totalDelivered = turs.reduce((acc, curr) => acc + (curr.manualDeliveredCount || 0), 0);
      totalPay = totalDelivered * (pieceRate || 0);
    }

    // Apply manual overrides
    totalPay += (bonuses || 0);
    totalPay -= (deductions || 0);

    const slip = await SalarySlip.create({
      worker: userId,
      createdBy: req.user._id,
      month,
      year,
      totalHours,
      hourlyRate: hourlyRate || 0,
      totalPackagesDelivered: totalDelivered,
      ratePerPackage: pieceRate || 0,
      bonuses: bonuses || 0,
      bonusReason,
      deductions: deductions || 0,
      deductionReason,
      totalPay,
      status: 'DRAFT'
    });

    res.status(201).json(slip);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Salary Slips
// @route   GET /api/finance/salary
// @access  Private 
export const getSalarySlips = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'ADMIN') {
      query.worker = req.user._id;
      query.status = { $ne: 'DRAFT' }; // Workers only see Sent/Signed slips
    }

    const slips = await SalarySlip.find(query)
      .populate('worker', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json(slips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Salary Slip (Status / Signature)
// @route   PUT /api/finance/salary/:id
// @access  Private 
export const updateSalarySlip = async (req, res) => {
  try {
    const { status, workerSignature, adminSignature } = req.body;
    const slip = await SalarySlip.findById(req.params.id);

    if (!slip) return res.status(404).json({ message: 'Salary slip not found' });

    // Permissions logic
    if (req.user.role === 'ADMIN') {
      if (status) slip.status = status;
      if (adminSignature) slip.adminSignature = adminSignature;
    } else if (slip.worker.toString() === req.user._id.toString()) {
      if (workerSignature) slip.workerSignature = workerSignature;
      if (status === 'SIGNED') slip.status = 'SIGNED'; // Worker can only sign
    } else {
      return res.status(403).json({ message: 'Unauthorized to edit this slip.' });
    }

    await slip.save();
    res.json(slip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
