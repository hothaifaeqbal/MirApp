import Expense from '../models/expense.model.js';
import Attendance from '../models/attendance.model.js';
import Tur from '../models/tur.model.js';
import User from '../models/user.model.js';

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

// @desc    Calculate Salary for a Worker in a Date Range
// @route   POST /api/finance/salary
// @access  Private (Admin)
export const calculateSalary = async (req, res) => {
  try {
    const { userId, startDate, endDate, hourlyRate, pieceRate } = req.body;

    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ message: 'User ID, start date, and end date are required.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let totalSalary = 0;
    let details = {};

    if (user.role === 'WAREHOUSE') {
      if (!hourlyRate) return res.status(400).json({ message: 'hourlyRate is required for Warehouse workers.' });
      
      const attendances = await Attendance.find({
        user: userId,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
      });

      const totalHours = attendances.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
      totalSalary = totalHours * hourlyRate;
      
      details = {
        totalHours: totalHours.toFixed(2),
        hourlyRate,
        attendancesCount: attendances.length
      };

    } else if (user.role === 'DRIVER') {
      if (!pieceRate) return res.status(400).json({ message: 'pieceRate is required for Drivers.' });

      const turs = await Tur.find({
        driver: userId,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
      });

      const totalDelivered = turs.reduce((acc, curr) => acc + (curr.deliveredPackages || 0), 0);
      totalSalary = totalDelivered * pieceRate;

      details = {
        totalDelivered,
        pieceRate,
        tursCount: turs.length
      };
    } else {
      return res.status(400).json({ message: 'Admin salaries are not calculated here.' });
    }

    res.json({
      user: user.name,
      role: user.role,
      period: { startDate, endDate },
      totalSalary: totalSalary.toFixed(2),
      currency: 'EUR',
      details
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
