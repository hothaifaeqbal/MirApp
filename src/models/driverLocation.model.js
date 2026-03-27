import mongoose from 'mongoose';

const driverLocationSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],    
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Create a 2dsphere index for geospatial queries (calculating distances, finding nearby drivers)
driverLocationSchema.index({ location: '2dsphere' });
// Index on driver for fast queries of a specific driver's history
driverLocationSchema.index({ driver: 1, timestamp: -1 });

export default mongoose.model('DriverLocation', driverLocationSchema);
