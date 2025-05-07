const POI = require("../models/Poi");
const axios = require("axios");
require("dotenv").config();

//Find POIs Near a Location (within X km)
const searchPOINearLocation = async (req, res) => {
    const { type, radius, latitude, longitude } = req.query;
  
    // Validate query parameters
    if (!type || !radius || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required query parameters." });
    }
  
    try {
      // Fetch data from Google Places API
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
        {
          params: {
            key: process.env.MAPS_API_KEY, // Using environment variable for API key
            location: `${latitude},${longitude}`,
            radius: parseInt(radius), // Ensure radius is treated as an integer
            type,
          },
        }
      );
  
      // Format and send the response
      const pois = response.data.results.map((poi) => ({
        name: poi.name,
        location: {
          lat: poi.geometry.location.lat,
          lng: poi.geometry.location.lng,
        },
        type,
  
      }));
  
      // Send the POIs as a response
      return res.status(200).json({ data: response.data });
    } catch (error) {
      // Error logging and response
      console.error("Error fetching POIs:", error.message);
  
      // Handle Google API errors
      const errorMessage =
        error.response?.data?.error_message || "An error occurred while fetching POIs.";
      return res.status(500).json({ error: errorMessage });
    }
  };
  
module.exports = {
    searchPOINearLocation
};
