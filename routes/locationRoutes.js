const express = require("express");
const {
    setLocation,getFavioriteLocation,searchLocation,saveSearchLocation,getSavedLocations,
} = require("../controllers/locationController");

const { verifyToken } = require("../middlewares/verifyToken");

const router = express.Router();

router.post("/set-location", verifyToken, setLocation);
router.get("/saved-locations", verifyToken, getSavedLocations);
router.get("/fav-location", verifyToken,getFavioriteLocation);
router.get("/search",  searchLocation);
router.post("/saveSearch", verifyToken, saveSearchLocation);

module.exports = router; 