import express from 'express';
import { addExpense, getExpenses, createSalarySlip, getSalarySlips, updateSalarySlip } from '../controllers/finance.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/expenses')
  .post(protect, adminOnly, addExpense)
  .get(protect, adminOnly, getExpenses);

router.route('/salary')
  .post(protect, adminOnly, createSalarySlip)
  .get(protect, getSalarySlips);

router.put('/salary/:id', protect, updateSalarySlip);

export default router;
