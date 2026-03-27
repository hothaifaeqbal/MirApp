import app from './src/app.js';
import connectDB from './src/config/db.js';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import User from './src/models/user.model.js';

// Load env vars
dotenv.config();

const PORT = process.env.PORT || 5000;

// Auto-seed the Master Admin account from environment variables
const seedAdmin = async () => {
  const adminCode = process.env.ADMIN_CODE;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminCode || !adminPassword) {
    console.log('[SEED] ADMIN_CODE or ADMIN_PASSWORD not set. Skipping admin seed.');
    return;
  }

  const existingAdmin = await User.findOne({ role: 'ADMIN' });
  if (existingAdmin) {
    console.log(`[SEED] Admin account already exists: ${existingAdmin.name}`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  await User.create({
    name: 'Master Admin',
    password: hashedPassword,
    role: 'ADMIN',
    status: 'APPROVED',
    activationCode: adminCode,
    deviceId: 'ADMIN_UNBOUND', // Will be bound on first login
  });

  console.log('[SEED] ✅ Master Admin account created successfully.');
};

// Connect to database then start server
connectDB().then(async () => {
  await seedAdmin();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
