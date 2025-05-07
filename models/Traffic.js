const mongoose = require('mongoose');

const trafficSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'], // GeoJSON type for geospatial queries
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  type: {
    type: String,
    enum: ['accident', 'hazard', 'road_closure', 'speed_trap'], // Predefined categories
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'], // Traffic severity levels
    required: true,
  },
  description: {
    type: String, // Optional details about the incident
    default: '',
  },
  imagePath: { type: String },
  videoPath: { type: String },       
  thumbnailPath: { type: String },
  reportedAt: {
    type: Date,
    default: Date.now, // Timestamp for when the incident was reported
  },
  validations: {
    type: Number, // Number of user validations (confirmations)
    default: 0,
  },
  inaccuracies: {
    type: Number, // Number of user-reported inaccuracies
    default: 0,
  },
});

trafficSchema.index({ location: '2dsphere' }); // Geospatial index for location queries

module.exports = mongoose.model('Traffic', trafficSchema);
