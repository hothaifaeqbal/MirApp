import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  trackingNumber: { type: String, required: true },
  address: { type: String, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'DELIVERED', 'MAILBOX', 'RETURNED'],
    default: 'PENDING'
  },
  deliveryNotes: String, // e.g. "Left at back door"
});

const turSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  packages: [packageSchema],
  
  // Overrides for manual day counts
  manualDeliveredCount: { type: Number, default: 0 },
  manualReturnedCount: { type: Number, default: 0 },
  
  // Salary specific
  ratePerPackage: { type: Number, required: true, default: 0.50 }, // e.g 0.50 Euros

  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED'],
    default: 'ACTIVE'
  }
}, {
  timestamps: true,
});

export default mongoose.model('Tur', turSchema);
