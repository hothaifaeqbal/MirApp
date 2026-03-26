import app from './src/app.js';
import connectDB from './src/config/db.js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to database then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
