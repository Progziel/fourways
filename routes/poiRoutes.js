const express = require("express");
const router = express.Router();
const poiController = require("../controllers/poiController");

/**
 * @swagger
 * /api/poi/search/near:
 *   get:
 *     summary: Search for Points of Interest (POIs) near a location
 *     tags: [POI]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: Type of POI to search for (e.g., restaurant, cafe)
 *         example: restaurant
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *         required: true
 *         description: Search radius in meters
 *         example: 1000
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *           format: float
 *         required: true
 *         description: Latitude of the center point
 *         example: 37.7749
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *           format: float
 *         required: true
 *         description: Longitude of the center point
 *         example: -122.4194
 *     responses:
 *       200:
 *         description: Successfully retrieved POIs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: Example Restaurant
 *                           geometry:
 *                             type: object
 *                             properties:
 *                               location:
 *                                 type: object
 *                                 properties:
 *                                   lat:
 *                                     type: number
 *                                     example: 37.7749
 *                                   lng:
 *                                     type: number
 *                                     example: -122.4194
 *                           types:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["restaurant"]
 *       400:
 *         description: Missing required query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing required query parameters.
 *       500:
 *         description: Error fetching POIs (e.g., Google API error)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: An error occurred while fetching POIs.
 */
router.get("/search/near", poiController.searchPOINearLocation);

module.exports = router;