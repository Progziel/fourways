const Location = require("../models/Location");
const axios = require("axios");
require("dotenv").config();

const setLocation = async (req, res) => {
    try {
      const { userId } = req.user;
      const { type, coordinates } = req.body;
  
      if (!["Home", "Work", "Other"].includes(type)) {
        return res.status(400).json({ message: "Invalid location type." });
      }
  
      const existingLocation = await Location.findOne({ userId, type });
      if (existingLocation) {
        existingLocation.coordinates = coordinates;
        await existingLocation.save();
        return res.status(200).json({
          message: `${type} location updated successfully.`,
          data: existingLocation,
        });
      }
  
      const newLocation = new Location({ userId, type, coordinates });
      await newLocation.save();
      res.status(201).json({
        message: `${type} location saved successfully.`,
        data: newLocation,
      });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ message: "Internal server error." });
    }
  };

  const getSavedLocations = async (req, res) => {
    try {
      const { userId } = req.user;
      const locations = await Location.find({ userId });
  
      if (locations.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No saved locations found.",
          data: [],
        });
      }
  
      res.status(200).json({
        success: true,
        message: "location by type retrieved successfully.",
        data: locations,
      });
    } catch (error) {
      console.error("Error retrieving locations", error.message);
      res.status(500).json({ message: "Internal server error." });
    }
  };
  
const getFavioriteLocation = async (req, res) => {
  try {
    const { userId } = req.user;
    const locations = await Location.find({ userId, isFav:true });

    if (locations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No saved locations found.",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "faviorite location retrieved successfully.",
      data: locations,
    });
  } catch (error) {
    console.error("Error retrieving locations", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

const searchLocation = async (req, res) => {
  const { query, lat, lng } = req.query; // User's current location as query params

  // Validate query and user location
  if (!query) {
    return res.status(400).json({ message: 'Query parameter is required' });
  }
  if (!lat || !lng) {
    return res.status(400).json({ message: 'Current location (lat, lng) is required' });
  }

  try {
    // Step 1: Search for locations using Places API
    const placesResponse = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query: query, // e.g., "Gloria Jean's Coffees, Karachi"
        key: process.env.MAPS_API_KEY,
      },
    });

    if (placesResponse.data.results.length === 0) {
      return res.status(404).json({ message: 'No locations found' });
    }

    // Step 2: Prepare origins and destinations for Distance Matrix API
    const origin = `${lat},${lng}`; // User's current location
    const destinations = placesResponse.data.results.map(place => 
      `${place.geometry.location.lat},${place.geometry.location.lng}`
    ).join('|'); // Join multiple destinations with | separator

    // Step 3: Call Distance Matrix API
    const distanceResponse = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: origin,
        destinations: destinations,
        key: process.env.MAPS_API_KEY,
        mode: 'driving', // Options: driving, walking, bicycling, transit
        units: 'metric', // Returns distance in kilometers
      },
    });

    // Step 4: Check for Distance Matrix API errors
    if (distanceResponse.data.status !== 'OK') {
      throw new Error(`Distance Matrix API error: ${distanceResponse.data.error_message || 'Unknown error'}`);
    }

    // Step 5: Combine place results with distance data
    const resultsWithDistance = placesResponse.data.results.map((place, index) => {
      const distanceData = distanceResponse.data.rows[0].elements[index];
      let distance = null;
      if (distanceData.status === 'OK') {
        distance = distanceData.distance.value / 1000; // Convert meters to kilometers
      } else {
        console.warn(`Distance not available for ${place.name}: ${distanceData.status}`);
        distance = -1; // Indicate distance unavailable
      }
      return {
        ...place,
        distance: parseFloat(distance.toFixed(2)), // Distance in kilometers, rounded to 2 decimals
      };
    });

    // Sort results by distance (ascending), ignoring unavailable distances
    resultsWithDistance.sort((a, b) => {
      if (a.distance === -1) return 1;
      if (b.distance === -1) return -1;
      return a.distance - b.distance;
    });

    // Send the results back to the client
    return res.status(200).json({
      status: 200,
      message: 'Locations retrieved successfully',
      data: resultsWithDistance,
    });
  } catch (error) {
    console.error('Error searching location:', error.message);
    return res.status(500).json({
      status: 500,
      message: 'Failed to fetch location data',
      data: null,
      error: error.message, // Optional: Include error details for debugging
    });
  }
};

const saveSearchLocation = async (req, res) => {
  try {
    const { userId, type, placeId, name, address, coordinates, isFav, folderName } = req.body;

    // Check if location already exists
    const existingLocation = await Location.findOne({ placeId, userId });

    if (existingLocation) {
      return res.status(400).json({ message: "Location already exists!", location: existingLocation });
    }

    // Create new location entry
    const newLocation = new Location({
      userId,
      type,
      placeId,
      name,
      address,
      coordinates,
      isFav: isFav || false,
      folderName: folderName || null,
    });

    await newLocation.save();

    res.status(201).json({ message: "Location saved successfully", location: newLocation });
  } catch (error) {
    res.status(500).json({ message: "Error saving location", error: error.message });
    console.error("Error details:", error);
  }
};




  module.exports = {
    setLocation,
    saveSearchLocation,
    getFavioriteLocation,
    getSavedLocations,
    searchLocation,

  };