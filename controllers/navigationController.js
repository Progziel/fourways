const NavRoute = require("../models/NavRoute");
const { redisClient } = require("../config/redis");
const logger = require("../utils/logger");

const axios = require("axios");
require("dotenv").config();


  const calculateRoute = async (req, res) => {
  const { start, end } = req.body;

  // Validate input coordinates
  if (
    !start || !start.lat || !start.lng ||
    !end || !end.lat || !end.lng
  ) {
    return res.status(400).json({
      success: false,
      message: "Start and end coordinates (latitude, longitude) are required.",
    });
  }

  try {
    const cacheKey = `route:${start.lat},${start.lng}:${end.lat},${end.lng}:alternatives`;

    // Check Redis cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      logger.info('Cache hit! Returning data from Redis.');
      return res.status(200).json({
        statusCode: 200,
        message: 'Routes retrieved from cache.',
        data: JSON.parse(cachedData),
      });
    }

    // No cache found; fetch from Google Maps API with alternatives
    logger.info('Cache miss! Fetching data from Google Maps API...');
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: `${start.lat},${start.lng}`,
        destination: `${end.lat},${end.lng}`,
        key: process.env.MAPS_API_KEY,
        mode: 'driving',
        units: 'metric',
        alternatives: true, // Enable alternative routes
      },
      timeout: 10000,
    });

    const routeData = response.data;

    // Validate API response
    if (routeData.status !== 'OK' || !routeData.routes || routeData.routes.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        message: 'No route found between the given coordinates.',
        data: null,
      });
    }

    // Process all alternative routes
    const routes = routeData.routes.map((route) => {
      const leg = route.legs[0];
      const polyline = route.overview_polyline.points;

      const steps = leg.steps.map((step) => ({
        instructions: step.html_instructions,
        distance: step.distance.text,
        duration: step.duration.text,
      }));

      return {
        distance: leg.distance.value, // Distance in meters
        duration: leg.duration.value, // Duration in seconds
        polyline, // Encoded polyline string
        steps, // Step-by-step instructions
      };
    });

    await redisClient.setex(cacheKey, 3600, JSON.stringify(routes));
    return res.status(200).json({
      statusCode: 200,
      message: 'Routes calculated successfully.',
      data: routes,
    });
  } catch (error) {
    logger.error('Error fetching routes from Google Maps:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Error fetching routes from Google Maps.',
      data: null,
      error: error.message,
    });
  }
};

const fetchRoute = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { start, end } = req.body;
    const cacheKey = `route:${userId}:${start.lat},${start.lng}:${end.lat},${end.lng}`;

    const cachedRoute = await redisClient.get(cacheKey);
    if (cachedRoute) {
      logger.info("Cache hit for saved route");
      return res.status(200).json({
        statusCode: 200,
        message: "Route retrieved from cache.",
        data: JSON.parse(cachedRoute),
      });
    }

    const route = await NavRoute.findOne({
      userId,
      "start.coordinates": [start.lng, start.lat],
      "end.coordinates": [end.lng, end.lat],
    }).lean();

    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found." });
    }

    await redisClient.setex(cacheKey, 3600, JSON.stringify(route));

    res.status(200).json({
      success: true,
      message: "Route retrieved from database.",
      data: route,
    });
  } catch (error) {
    next(error);
  }
};

const saveRoute = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { start, end, waypoints, distance, duration } = req.body;

    const newRoute = new NavRoute({
      userId,
      start: { type: "Point", coordinates: [start.lng, start.lat] },
      end: { type: "Point", coordinates: [end.lng, end.lat] },
      waypoints: waypoints?.map((point) => ({
        type: "Point",
        coordinates: [point.lng, point.lat],
      })),
      distance,
      duration,
    });

    const savedRoute = await newRoute.save();
    res.status(201).json({
      success: true,
      message: "Route saved successfully.",
      data: savedRoute,
    });
  } catch (error) {
    next(error);
  }
};

const getSavedRoutes = async (req, res, next) => {
  try {
    const { userId } = req.user;

    const routes = await NavRoute.find({ userId }).lean();
    res.status(200).json({
      success: true,
      message: "Saved routes retrieved successfully.",
      data: routes,
    });
  } catch (error) {
    next(error);
  }
};

const deleteRoute = async (req, res, next) => {
  try {
    const { routeId } = req.params;
    const deletedRoute = await NavRoute.findByIdAndDelete(routeId);

    if (!deletedRoute) {
      return res.status(404).json({
        success: false,
        message: "Route not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Route deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};


const getNearbyRoutes = async (req, res, next) => {
    try {
      const { coordinates, radius = 5000 } = req.query; // Default radius is 5 km
      if (!coordinates) {
        return res.status(400).json({
          statusCode: 400,
          message: "Coordinates are required in the format 'lng,lat'.",
          data: [],
        });
      }
  
      const [lng, lat] = coordinates.split(",").map(parseFloat);
      if (isNaN(lng) || isNaN(lat)) {
        return res.status(400).json({
          statusCode: 400,
          message: "Invalid coordinates format. Use 'lng,lat'.",
          data: [],
        });
      }
  
      const nearbyRoutes = await NavRoute.find({
        start: {
          $geoWithin: {
            $centerSphere: [[lng, lat], radius / 6378100], // Convert radius to radians
          },
        },
      })
        .limit(20) // Optional: Limit the number of results to avoid excessive data
        .lean();
  
      if (nearbyRoutes.length === 0) {
        return res.status(404).json({
          statusCode: 404,
          message: "No nearby routes found.",
          data: [],
        });
      }
  
      res.status(200).json({
        statusCode: 200,
        message: "Nearby routes retrieved successfully.",
        data: nearbyRoutes,
      });
    } catch (error) {
      console.error("Error retrieving nearby routes:", error.message);
      next(error);
    }
  };

  const addStop = async (req, res) => {
    try {
      const { routeId, name, latitude, longitude } = req.body;
       if (!routeId || !name || !latitude || !longitude) {
        return res.status(400).json({ error: "Missing required fields." });
      }
  
      const route = await NavRoute.findById(routeId);
      if (!route) {
        return res.status(404).json({ error: "Route not found." });
      }
  
      // Add stop to waypoints
      route.waypoints.push({
        name,
        type: "Point",
        coordinates: [longitude, latitude],
        index: route.waypoints.length + 1, // Order the stop
      });
  
      await route.save();
  
      res.status(200).json({ message: "Stop added successfully.", route });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error." });
    }
  };
  

module.exports = {
  calculateRoute,
  fetchRoute,
  saveRoute,
  getSavedRoutes,
  deleteRoute,
  getNearbyRoutes,
  addStop
};
