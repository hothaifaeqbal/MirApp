import express from 'express';
import { updateLocation, getActiveDriversLocations } from '../controllers/location.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/update', protect, updateLocation);
router.get('/active', protect, adminOnly, getActiveDriversLocations);

export default router;
