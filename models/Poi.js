const mongoose = require("mongoose");

const POISchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  type: { type: String, required: true },
});

module.exports = mongoose.model("POI", POISchema);