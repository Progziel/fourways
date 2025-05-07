const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReportSchema = new Schema({
  driverId: {  type: mongoose.Schema.Types.ObjectId,ref: "User", required: true },
  reportDate: { type: Date, required: true },
  reportType: { 
    type: String, 
    required: true,
    enum: [
      'Police',
      'Traffic',
      'Crash',
      'Hazard',
      'Closure',
      'Blocked Lane',
      'Map Issue',
      'Bad Weather',
      'Fuel Prices',
      'Roadside Help',
      'Map Chat',
      'Explore'
    ]
  },
  subCategory: { 
    type: String,
   
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [] },
    address: { type: String }
  },
  description: { type: String},
  imageUrl: { type: String },
  validations: {
    type: Number, // Number of user validations (confirmations)
    default: 0,
  },
  inaccuracies: {
    type: Number, // Number of user-reported inaccuracies
    default: 0,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Optional: Add index for geospatial queries
ReportSchema.index({ location: '2dsphere' });

const DriverReport = mongoose.model('DriverReport', ReportSchema);
module.exports = DriverReport;
