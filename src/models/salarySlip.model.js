import mongoose from 'mongoose';

const salarySlipSchema = new mongoose.Schema({
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  
  // Accumulated data from Attendance / Logistics
  totalHours: { type: Number, default: 0 },
  hourlyRate: { type: Number, default: 0 },
  totalPackagesDelivered: { type: Number, default: 0 },
  ratePerPackage: { type: Number, default: 0 },
  
  // Custom manual inputs by Admin
  bonuses: { type: Number, default: 0 },
  bonusReason: { type: String },
  deductions: { type: Number, default: 0 },
  deductionReason: { type: String }, // e.g., Diesel, Repair

  totalPay: { type: Number, required: true, default: 0 },
  
  // Flow state
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'SIGNED'],
    default: 'DRAFT',
  },
  
  // File attachments (URLs / Base64 / GridFS references depending on infrastructure)
  // For MVP, if storing signature image directly, Admin pre-signs before sending, Worker signs on receipt.
  adminSignature: { type: String }, // base64 or url
  workerSignature: { type: String }, // base64 or url
  finalPdfUrl: { type: String }, // if uploaded to s3/cloud

}, { timestamps: true });

export default mongoose.model('SalarySlip', salarySlipSchema);
