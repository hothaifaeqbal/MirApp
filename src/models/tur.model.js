import mongoose from 'mongoose';

const turSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Admin or Warehouse worker
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  totalPackagesTaken: {
    type: Number,
    required: true,
    min: 0
  },
  returns: {
    type: Number, // Rücklauf
    default: 0,
    min: 0
  },
  deliveredPackages: {
    type: Number, // total - returns
    default: 0
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'COMPLETED'],
    default: 'IN_PROGRESS'
  }
}, {
  timestamps: true
});

// Pre-save to calculate delivered
turSchema.pre('save', function (next) {
  if (this.totalPackagesTaken >= this.returns) {
    this.deliveredPackages = this.totalPackagesTaken - this.returns;
  }
  next();
});

const Tur = mongoose.model('Tur', turSchema);
export default Tur;
