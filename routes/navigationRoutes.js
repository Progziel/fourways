const express = require("express");
const {
  calculateRoute,
  fetchRoute,
  saveRoute,
  getSavedRoutes,
  deleteRoute,
  getNearbyRoutes,
  addStop
} = require("../controllers/navigationController");
const { verifyToken } = require("../middlewares/verifyToken");
const { apiLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

// Endpoint to calculate a real-time route
router.post("/calculate-route",apiLimiter, verifyToken, calculateRoute);

// Endpoint to fetch a specific saved or cached route
router.post("/fetch-route", verifyToken, fetchRoute);

// Endpoint to save a route
router.post("/save-route", verifyToken, saveRoute);

// Endpoint to get all saved routes for a user
router.get("/saved-routes", verifyToken, getSavedRoutes);

// Endpoint to delete a saved route
router.delete("/delete-route/:routeId", verifyToken, deleteRoute);

// Endpoint to get nearby routes (optional feature)
router.get("/nearby-routes", verifyToken, getNearbyRoutes);

router.post("/addStop", verifyToken, addStop );

module.exports = router;