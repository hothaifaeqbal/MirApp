import express from 'express';
import { createTur, updateTur, getTurs } from '../controllers/logistics.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/turs')
  .post(protect, createTur)
  .get(protect, getTurs);

router.route('/turs/:id')
  .put(protect, updateTur);

export default router;
