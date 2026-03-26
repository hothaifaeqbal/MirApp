import express from 'express';
import { addExpense, getExpenses, calculateSalary } from '../controllers/finance.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/expenses')
  .post(protect, adminOnly, addExpense)
  .get(protect, adminOnly, getExpenses);

router.post('/salary', protect, adminOnly, calculateSalary);

export default router;
