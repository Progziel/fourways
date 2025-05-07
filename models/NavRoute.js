const mongoose = require("mongoose");

const navRouteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: true,
    },
    start: {
      type: { type: String, default: "Point" }, // GeoJSON type
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (coords) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && 
                   coords[1] >= -90 && coords[1] <= 90;
          },
          message: "Start coordinates must be valid [longitude, latitude] values.",
        },
      },
    },
    end: {
      type: { type: String, default: "Point" }, // GeoJSON type
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (coords) {
            return coords.length === 2 &&
                   coords[0] >= -180 && coords[0] <= 180 &&
                   coords[1] >= -90 && coords[1] <= 90;
          },
          message: "End coordinates must be valid [longitude, latitude] values.",
        },
      },
    },
    waypoints: [
      {
        type: { type: String, default: "Point" },
        coordinates: { type: [Number], required: true },
        name: { type: String, required: true },
        index: { type: Number, required: true }, // order of the stop
      },
    ],
    distance: {
      type: String, // e.g., "20 km"
      required: true,
    },
    duration: {
      type: String, // e.g., "30 mins"
      required: true,
    },
   
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);

// Index for geospatial queries
navRouteSchema.index({ start: "2dsphere" });
navRouteSchema.index({ end: "2dsphere" });

const NavRoute = mongoose.model("NavRoute", navRouteSchema);

module.exports = NavRoute;
