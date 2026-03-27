import express from 'express';
import { checkIn, checkOut, kioskScan } from '../controllers/attendance.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/check-in', protect, checkIn);
router.post('/check-out', protect, checkOut);
router.post('/kiosk-scan', protect, adminOnly, kioskScan);

export default router;
