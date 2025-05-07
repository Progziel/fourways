const mongoose = require("mongoose");

const UserLocationSchema = new mongoose.Schema({
  name: { type: String, required: true }, 
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true }, 
  },
});

UserLocationSchema.index({ location: "2dsphere" });
module.exports = mongoose.model("UserLocation", UserLocationSchema);