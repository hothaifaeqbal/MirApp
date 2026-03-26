import express from 'express';
import { getUsers, approveUser, lockUser } from '../controllers/admin.controller.js';
import { protect, adminOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/users')
  .get(protect, adminOnly, getUsers);

router.route('/users/:id/approve')
  .put(protect, adminOnly, approveUser);

router.route('/users/:id/lock')
  .put(protect, adminOnly, lockUser);

export default router;
