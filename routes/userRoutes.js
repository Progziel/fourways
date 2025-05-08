const express = require('express');
const { getUserProfile, addUserLocation, getUserNearByLocation, 
    blockUser,getBlockedUsers,unblockUser, addUserImageToGallery,getUserGallery,
    removeConnection,getConnections,sendFriendRequest,acceptFriendRequest,
    cancelFriendRequest,rejectFriendRequest,getMutualFriends,updateUser,deleteFamilyMember,updateFamilyMember,
    sendFamilyRequest,rejectFamilyRequest,acceptFamilyRequest,searchUsers,searchConnections

} = require('../controllers/userController');
const {verifyToken} = require('../middlewares/verifyToken');
const upload = require("../middlewares/fileUpload");

const router = express.Router();

router.get('/get-profile', verifyToken, getUserProfile);

router.patch('/update-user/:_id', upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'coverPhoto', maxCount: 1 }
  ]), updateUser);

router.post('/user-location',addUserLocation);

router.get('/nearby',getUserNearByLocation);

router.post("/block-user", verifyToken, blockUser);

router.get("/get-blocked-users", verifyToken, getBlockedUsers);

router.post("/unblock-user", verifyToken, unblockUser);

router.post("/gallery", verifyToken, upload.single('image'), addUserImageToGallery);

router.get("/gallery", verifyToken, getUserGallery);




//family routes starts from here
router.post("/send-family-request", verifyToken, sendFamilyRequest);
router.post("/accept-family-request", verifyToken, acceptFamilyRequest);
router.post("/reject-family-request", verifyToken, rejectFamilyRequest);
router.delete("/member/:memberId", deleteFamilyMember);
router.patch("/member/:memberId", updateFamilyMember);
//family routes ends here

//connection routes starts from here
router.get("/get-connection", verifyToken, getConnections)
router.post("/send-friend-request", verifyToken, sendFriendRequest);
router.post("/accept-friend-request", verifyToken, acceptFriendRequest);
router.post("/reject-friend-request", verifyToken, rejectFriendRequest);
router.post("/cancel-friend-request", verifyToken, cancelFriendRequest);
router.delete("/remove-connection", verifyToken, removeConnection);
router.get("/get-mutual-friends", verifyToken,getMutualFriends );
//connection routes ends here

//search users in all User Model
router.get('/search', searchUsers);
router.get('/search-connections', verifyToken, searchConnections);


module.exports = router;