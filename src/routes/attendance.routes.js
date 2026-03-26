import express from 'express';
import { checkIn, checkOut } from '../controllers/attendance.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);

export default router;
