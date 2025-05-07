const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId,ref: "User", required: true },
    type: { 
      type: String, 
      // enum: ["Home", "Work", "Other"],
      // required: true 
    },
    placeId: { type: String,unique: true },
    name: { type: String,},
    address: { type: String },
    isFav:{ type: Boolean, default: false },
    folderName: { type: String },
    coordinates: {
      type: { type: String, default: 'Point' },
      coordinates: { 
        type: [Number], 
        required: true,
        validate: {
          validator: function (coords) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && 
                   coords[1] >= -90 && coords[1] <= 90;
          }, 
          message: "Coordinates must be valid [longitude, latitude] values."
        }
      }
    }
  },
  { timestamps: true }
);

locationSchema.index({ coordinates: '2dsphere' });

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
