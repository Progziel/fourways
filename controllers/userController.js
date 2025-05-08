const User = require('../models/User');
const UserLocation = require("../models/UserLocation");
const UserGallery = require('../models/UserGallery');
const Family = require('../models/Family');
const FamilyMember = require('../models/FamilyMember');
const fs = require("fs");
const mongoose = require('mongoose');

//get user profile
const getUserProfile = async (req, res) => {
  try {
  
      const userId = req.user.userId;

      // Use aggregation pipeline to fetch user profile
      const userProfile = await User.aggregate([
          { $match: { _id: new mongoose.Types.ObjectId(userId) } },
          { 
              $project: {
                  _id: 1,
                  full_name: 1,
                  email: 1,
                  profilePicture: 1,
                  connections: 1,
                  blockedUsers: 1,
                  friendRequests: 1,
                  hideFriends: 1,
                  isInvisible: 1,
                  tagline: 1,
                  coverPhoto: 1,
                  connectionsCount: { $size: { $ifNull: ["$connections", []] } } 
              }
          }
      ]);

      if (!userProfile || userProfile.length === 0) {
          return res.status(404).json({
              statusCode: 404,
              message: 'User not found',
              data: []
          });
      }

      // Use aggregation pipeline to fetch and process UserGallery data
      const userGallery = await UserGallery.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },  
          {
              $project: {
                  _id: 1,
                  imagePath: 1,
               }
          },
          { $sort: { createdAt: -1 } } 
      ]);

      // Combine user profile and user gallery into the response
      const response = {
          ...userProfile[0], // Aggregation returns an array, so take the first element
          userGallery
      };

      res.status(200).json({
          statusCode: 200,
          message: "User data retrieved successfully.",
          data: response
      });
  } catch (error) {
      res.status(500).json({
          statusCode: 500,
          message: error.message,
          data: []
      });
  }
};
const updateUser = async (req, res) => {
  try {
    const { _id } = req.params;
    const updates = req.body;

    // Handle multiple image uploads (e.g., 'profilePicture' and 'coverPhoto')
    if (req.files) {
      const allowedFields = ["profilePicture", "coverPhoto"];

      for (const field of allowedFields) {
        if (req.files[field]) {
          // Fetch the user's current image path from the database
          const user = await User.findById(_id);
          if (!user) {
            return res.status(404).json({
              statusCode: 404,
              message: "User not found.",
              data: null,
            });
          }

          const currentImagePath = user[field]; // Current image path
          // Check if the image exists and delete the old file
          if (currentImagePath && fs.existsSync(currentImagePath)) {
            fs.unlinkSync(currentImagePath); // Remove the existing image file
          }

          // Save the new file path in updates
          updates[field] = req.files[field][0].path; // Assuming req.files[field] returns an array
        }
      }
    }

    // Handle location update
    if (updates.location) {
      let parsedLocation = updates.location;
      if (typeof updates.location === "string") {
        try {
          parsedLocation = JSON.parse(updates.location);
        } catch (err) {
          return res.status(400).json({
            statusCode: 400,
            message: "Invalid location format. Must be a valid JSON string.",
            error: err.message,
          });
        }
      }

      // Validate location structure
      if (!parsedLocation || !parsedLocation.coordinates || !Array.isArray(parsedLocation.coordinates) || parsedLocation.coordinates.length !== 2) {
        return res.status(400).json({
          statusCode: 400,
          message: "Location must have a coordinates array with exactly two numbers: [longitude, latitude].",
        });
      }

      // Validate coordinates are numbers
      const [lng, lat] = parsedLocation.coordinates;
      if (typeof lng !== "number" || typeof lat !== "number") {
        return res.status(400).json({
          statusCode: 400,
          message: "Coordinates must be numeric values: [longitude, latitude].",
        });
      }

      // Ensure type is 'Point'
      parsedLocation.type = parsedLocation.type || "Point";

      // Add updatedAt timestamp to location (optional, since not in schema)
      parsedLocation.updatedAt = new Date();

      // Assign to updates
      updates.location = parsedLocation;
    }

    // Attempt to update the user in the database
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      updates,
      { new: true, runValidators: true } // Return the updated document and run validators
    );

    // Check if the user exists
    if (!updatedUser) {
      return res.status(404).json({
        statusCode: 404,
        message: "User not found.",
        data: null,
      });
    }

    // Respond with the updated user data
    res.status(200).json({
      statusCode: 200,
      message: "User updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    // Handle errors gracefully
    res.status(500).json({
      statusCode: 500,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const addUserLocation = async (req, res) => {
    const { name, longitude, latitude } = req.body;
  
    if (!name || !longitude || !latitude) {
      return res.status(400).json({ error: "Missing required fields: name, longitude, latitude." });
    }
  
    try {
      const userLocation = new UserLocation({
        name,
        location: { type: "Point", coordinates: [longitude, latitude] },
      });
  
      await userLocation.save();
      res.status(201).json({ message: "User location added successfully", userLocation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error adding user location" });
    }
  }

 const getUserNearByLocation= async (req, res) => {
    const { longitude, latitude, radius } = req.query;
  
    if (!longitude || !latitude || !radius) {
      return res.status(400).json({ error: "Missing required query parameters: longitude, latitude, radius." });
    }
  
    try {
      const nearbyUsers = await UserLocation.find({
        location: {
          $geoWithin: {
            $centerSphere: [[parseFloat(longitude), parseFloat(latitude)], parseFloat(radius) / 6378.1], // Convert radius to radians
          },
        },
      });
  
      res.status(200).json({ nearbyUsers });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error fetching nearby users" });
    }
  };

  const blockUser = async (req, res) => {
    try {
      const userId = req.user.userId; 
      const { blockUserId } = req.body;
  
      if (!blockUserId) {
        return res.status(400).json({
          statusCode: 400,
          message: "User ID to block is required.",
        });
      }
  
      const user = await User.findById(userId);
      const userToBlock = await User.findById(blockUserId);
  
      if (!userToBlock) {
        return res.status(404).json({
          statusCode: 404,
          message: "User to block not found.",
        });
      }
  
      if (user.blockedUsers.includes(blockUserId)) {
        return res.status(400).json({
          statusCode: 400,
          message: "User is already blocked.",
        });
      }
  
      // Remove the blockUserId from connections array if it exists
      user.connections = user.connections.filter(
        (connectionId) => connectionId.toString() !== blockUserId.toString()
      );
  
      // Add the blockUserId to the blockedUsers array
      user.blockedUsers.push(blockUserId);
      await user.save();
  
      res.status(200).json({
        statusCode: 200,
        message: "User blocked successfully.",
      });
    } catch (error) {
      res.status(500).json({
        statusCode: 500,
        message: "Internal server error.",
      });
    }
  };

  const getBlockedUsers = async (req, res) => {
    try {
      const userId = req.user.userId; 
  
      const user = await User.findById(userId).populate("blockedUsers", "full_name");
      if (!user) {
        return res.status(404).json({
          statusCode: 404,
          message: "User not found.",
        });
      }
  
      res.status(200).json({
        statusCode: 200,
        message: "Blocked users retrieved successfully.",
        data: user.blockedUsers,
      });
    } catch (error) {
      res.status(500).json({
        statusCode: 500,
        message: "Internal server error.",
      });
    }
  };

  const unblockUser = async (req, res) => {
    try {
      const userId = req.user.userId; 
      const { unblockUserId } = req.body;
  
      if (!unblockUserId) {
        return res.status(400).json({
          statusCode: 400,
          message: "User ID to unblock is required.",
        });
      }
  
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({
          statusCode: 404,
          message: "User not found.",
        });
      }
  
      const blockedIndex = user.blockedUsers.indexOf(unblockUserId);
  
      if (blockedIndex === -1) {
        return res.status(400).json({
          statusCode: 400,
          message: "User is not in your blocked list.",
        });
      }
  
      // Remove the user from the blocked list
      user.blockedUsers.splice(blockedIndex, 1);
  
      // Add the user to the connections list if not already connected
      if (!user.connections.includes(unblockUserId)) {
        user.connections.push(unblockUserId);
      }
  
      await user.save();
  
      res.status(200).json({
        statusCode: 200,
        message: "User unblocked and added to connections successfully.",
      });
    } catch (error) {
      res.status(500).json({
        statusCode: 500,
        message: "Internal server error.",
      });
    }
  };


// Add image to user gallery
const addUserImageToGallery = async (req, res) => {
    try {
        const userId = req.user.userId; 
        const imagePath = req.file.path;

        const newImage = new UserGallery({ userId, imagePath });
        await newImage.save();

        res.status(201).json({
            statusCode: 201,
            message: 'Image added successfully!',
            data: newImage
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Error adding image to gallery.',
            error: error.message
        });
    }
};

const getUserGallery = async (req, res) => {
  try {
      const userId = req.user.userId; 

      const images = await UserGallery.find({ userId });
      res.status(200).json({
          statusCode: 200,
          message: 'User gallery retrieved successfully.',
          data: images
      });
  } catch (error) {
      res.status(500).json({
          statusCode: 500,
          message: 'Error retrieving user gallery.',
          error: error.message
      });
  }
};

const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { requestId } = req.body;

    // Find the user (receiver) and the friend request
    const user = await User.findById(userId);
    if (!user) return res.status(404).send({ message: "User not found" });

    const friendRequest = user.friendRequests.find(
      (req) => req.sender.toString() === requestId
    );

    if (!friendRequest) return res.status(404).send({ message: "Request not found" });

    const senderId = friendRequest.sender;

    // Add the sender to receiver's connections if not already present
    if (!user.connections.includes(senderId)) {
      user.connections.push(senderId);
    }

    // Find the sender's user document
    const sender = await User.findById(senderId);
    if (!sender) return res.status(404).send({ message: "Sender not found" });

    // Add the receiver to the sender's connections if not already present
    if (!sender.connections.includes(userId)) {
      sender.connections.push(userId);
    }

    // Clear the friendRequests array for the receiver
    user.friendRequests = [];

    // Save both users' changes
    await user.save();
    await sender.save();

    res.status(200).send({
      message: "Friend request accepted",
      receiverConnections: user.connections,
      senderConnections: sender.connections,
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

const sendFamilyRequest = async (req, res) => {
  try {
    const { senderId, receiverId, relationship } = req.body;

    // Validate input
    if (!senderId || !receiverId || !relationship) {
      return res.status(400).json({
        status: 400,
        message: 'Sender ID, Receiver ID, and Relationship are required.',
        data: null,
      });
    }

    // Validate relationship against allowed values
    const validRelationships = ['parent', 'child', 'sibling', 'spouse', 'other'];
    if (!validRelationships.includes(relationship)) {
      return res.status(400).json({
        status: 400,
        message: `Invalid relationship. Must be one of: ${validRelationships.join(', ')}`,
        data: null,
      });
    }

    // Check if the sender exists
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        status: 404,
        message: 'Sender not found.',
        data: null,
      });
    }

    // Check if the receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        status: 404,
        message: 'Receiver not found.',
        data: null,
      });
    }

    // Check if the sender and receiver are the same
    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        status: 400,
        message: 'Cannot send a family request to yourself.',
        data: null,
      });
    }

    // Check if the sender and receiver are already in a family together
    const existingMember = await FamilyMember.findOne({
      user: senderId,
      familyId: receiver.familyId,
    });
    if (existingMember && receiver.familyId) {
      return res.status(400).json({
        status: 400,
        message: 'You are already in the same family as the receiver.',
        data: null,
      });
    }

    // Check if a family request already exists
    const familyRequestExists = receiver.familyRequests.some(
      (request) => request.sender.toString() === senderId && request.status === 'pending'
    );
    if (familyRequestExists) {
      return res.status(400).json({
        status: 400,
        message: 'Family request already sent.',
        data: null,
      });
    }

    // Add family request to the receiver's familyRequests array
    receiver.familyRequests.push({
      sender: senderId,
      receiver: receiverId,
      relationship,
      status: 'pending',
      requestedAt: new Date(),
    });
    await receiver.save();

    // Send push notification to the receiver
    if (receiver.deviceToken) {
      await sendPushNotification(receiver.deviceToken, {
        title: 'New Family Request',
        body: `${sender.full_name} sent you a family request as ${relationship}`,
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Family request sent successfully!',
      data: {
        requestId: receiver.familyRequests[receiver.familyRequests.length - 1]._id,
      },
    });
  } catch (error) {
    console.error('Error sending family request:', error.message);
    return res.status(500).json({
      status: 500,
      message: 'Server error.',
      data: null,
      error: error.message,
    });
  }
};

const rejectFamilyRequest = async (req, res) => {
  try {
    const { requestId } = req.body;
    const receiverId = req.user.userId;

    if (!requestId) {
      return res.status(400).json({
        status: 400,
        message: 'Request ID is required.',
        data: null,
      });
    }

    // Find the receiver (current user)
    const receiver = await User.findById(receiverId).lean();
  
    if (!receiver) {
      return res.status(404).json({
        status: 404,
        message: 'Receiver not found.',
        data: null,
      });
    }

    // Find the family request in the receiver's familyRequests array
    const familyRequest = receiver.familyRequests.find(x => x.sender.toString() === requestId);
      if (!familyRequest) {
      return res.status(404).json({
        status: 404,
        message: 'Family request not found.',
        data: null,
      });
    }

// Check if the receiver is authorized to reject this request
if (receiverId.toString() !== familyRequest.receiver.toString()) {
  return res.status(403).json({
    status: 403,
    message: 'Unauthorized: You can only reject requests sent to you.',
    data: null,
  });
}

// Check if the request is already processed
if (familyRequest.status !== 'pending') {
  return res.status(400).json({
    status: 400,
    message: `Family request has already been ${familyRequest.status}.`,
    data: null,
  });
}

// Update the family request status in the database using the request's _id
await User.findOneAndUpdate(
  { _id: receiverId, 'familyRequests._id': familyRequest._id },
  { $set: { 'familyRequests.$.status': 'declined' } },
  { new: true }
);

// Fetch the sender to send a notification
const sender = await User.findById(familyRequest.sender).lean();
if (sender && sender.deviceToken) {
  await sendPushNotification(sender.deviceToken, {
    title: 'Family Request Rejected',
    body: `${receiver.full_name} has declined your family request as ${familyRequest.relationship}.`,
  });
}

    // Fetch the sender to send a notification
    // const sender = await User.findById(familyRequest.sender);
    // if (sender && sender.deviceToken) {
    //   await sendPushNotification(sender.deviceToken, {
    //     title: 'Family Request Rejected',
    //     body: `${receiver.full_name} has declined your family request as ${familyRequest.relationship}.`,
    //   });
    // }

    return res.status(200).json({
      status: 200,
      message: 'Family request rejected successfully.',
      data: {
        requestId,
      },
    });
  } catch (error) {
    console.error('Error rejecting family request:', error.message);
    return res.status(500).json({
      status: 500,
      message: 'Server error.',
      data: null,
      error: error.message,
    });
  }
};

const acceptFamilyRequest = async (req, res) => {
  try {
    const { requestId } = req.body; // Represents the sender's ID
    const receiverId = req.user.userId;

    // Validate input
    if (!requestId) {
      return res.status(400).json({
        status: 400,
        message: 'Sender ID is required.',
        data: null,
      });
    }

    // Find the receiver (current user) to get their familyId
    const receiver = await User.findById(receiverId).lean();
    if (!receiver) {
      return res.status(404).json({
        status: 404,
        message: 'Receiver not found.',
        data: null,
      });
    }

    // Find the sender to get their familyId
    const sender = await User.findById(requestId).lean();
    if (!sender) {
      return res.status(404).json({
        status: 404,
        message: 'Sender not found.',
        data: null,
      });
    }

    // Determine the familyId (use sender's familyId if exists, otherwise receiver's or create a new family)
    let familyId = sender.familyId || receiver.familyId;
    let family;

    if (!familyId) {
      // Create a new family if neither user has a familyId
      family = new Family({
        name: `${receiver.full_name}'s Family`, // Customize as needed
        members: [], // Will add FamilyMember IDs
        createdBy: receiverId,
        familyRequests: [],
      });
      await family.save();
      familyId = family._id;

      // Create FamilyMember entry for the sender
      const senderFamilyMember = new FamilyMember({
        user: sender._id,
        familyId: familyId,
        relationship: 'other', // Default since no request yet
        locationSharing: false,
        parameterType: 'Circle',
        radius: 500,
        vertices: [],
      });
      await senderFamilyMember.save();

      // Add sender's FamilyMember ID to the family's members array
      await Family.findOneAndUpdate(
        { _id: familyId },
        { $push: { members: senderFamilyMember._id } },
        { new: true }
      );
      console.log(`Added sender FamilyMember ID ${senderFamilyMember._id} to family ${familyId}`);
    } else {
      // Use existing family
      family = await Family.findById(familyId).lean();
      if (!family) {
        return res.status(404).json({
          status: 404,
          message: 'Family not found.',
          data: null,
        });
      }

    }

    // Find the family request in the family's familyRequests array
    const familyRequest = receiver.familyRequests.find(x => x.sender.toString() === requestId);
    if (!familyRequest) {
      return res.status(404).json({
        status: 404,
        message: 'Family request not found.',
        data: null,
      });
    }

    // Create a FamilyMember entry for the receiver
    const receiverFamilyMember = new FamilyMember({
      user: receiverId,
      familyId: familyId,
      relationship: familyRequest.relationship, // Use the relationship from the request
      locationSharing: false,
      parameterType: 'Circle',
      radius: 500,
      vertices: [],
    });
    await receiverFamilyMember.save();

    const updatedFamily = await Family.findOneAndUpdate(
      { _id: familyId, members: { $ne: receiverFamilyMember._id } }, // Ensure the ID isn't already in members
      { $push: { members: receiverFamilyMember._id } },
      { new: true }
    );
    if (updatedFamily) {
      console.log(`Added receiver FamilyMember ID ${receiverFamilyMember._id} to family ${familyId}`);
    } else {
      console.log(`Receiver FamilyMember ID ${receiverFamilyMember._id} already in family ${familyId} or family not updated`);
    }

    await User.findOneAndUpdate(
      { _id: receiverId, 'familyRequests.sender': requestId },
      {
        $set: { 'familyRequests.$.status': 'accepted' },
      },
      { new: true }
    );

    // Update familyId for both sender and receiver
    await User.findByIdAndUpdate(receiverId, { $set: { familyId: familyId } });
    if (!sender.familyId) {
      await User.findByIdAndUpdate(sender._id, { $set: { familyId: familyId } });
    }

    // Send a notification to the sender
    // if (sender && sender.deviceToken) {
    //   await sendPushNotification(sender.deviceToken, {
    //     title: 'Family Request Accepted',
    //     body: `${receiver.full_name} has accepted your family request as ${familyRequest.relationship}.`,
    //   });
    // }

    return res.status(200).json({
      status: 200,
      message: 'Family request accepted successfully.',
      data: {
        requestId: familyRequest._id, // Note: familyRequests subdocuments have _id
        familyId: familyId,
      },
    });
  } catch (error) {
    console.error('Error accepting family request:', error.message);
    return res.status(500).json({
      status: 500,
      message: 'Server error.',
      data: null,
      error: error.message,
    });
  }
};

// const acceptFamilyRequest = async (req, res) => {
//   try {
//     const { requestId } = req.body;
//     const receiverId = req.user.userId;

//     if (!requestId) {
//       return res.status(400).json({
//         status: 400,
//         message: 'Request ID is required.',
//         data: null,
//       });
//     }

//     // Find the receiver (current user)
//     const receiver = await User.findById(receiverId).lean();
  
//     if (!receiver) {
//       return res.status(404).json({
//         status: 404,
//         message: 'Receiver not found.',
//         data: null,
//       });
//     }

//     // Find the family request in the receiver's familyRequests array
//     const familyRequest = receiver.familyRequests.find(x => x.sender.toString() === requestId);
//       if (!familyRequest) {
//       return res.status(404).json({
//         status: 404,
//         message: 'Family request not found.',
//         data: null,
//       });
//     }

// // Check if the receiver is authorized to accept this request
// if (receiverId.toString() !== familyRequest.receiver.toString()) {
//   return res.status(403).json({
//     status: 403,
//     message: 'Unauthorized: You can only accept requests sent to you.',
//     data: null,
//   });
// }

// // Check if the request is already processed
// if (familyRequest.status !== 'pending') {
//   return res.status(400).json({
//     status: 400,
//     message: `Family request has already been ${familyRequest.status}.`,
//     data: null,
//   });
// }

// // Update the family request status in the database using the request's _id
// await User.findOneAndUpdate(
//   { _id: receiverId, 'familyRequests._id': familyRequest._id },
//   { $set: { 'familyRequests.$.status': 'accepted' } },
//   { new: true }
// );

//     // Fetch the sender to send a notification
//     // const sender = await User.findById(familyRequest.sender);
//     // if (sender && sender.deviceToken) {
//     //   await sendPushNotification(sender.deviceToken, {
//     //     title: 'Family Request Rejected',
//     //     body: `${receiver.full_name} has declined your family request as ${familyRequest.relationship}.`,
//     //   });
//     // }

//     return res.status(200).json({
//       status: 200,
//       message: 'Family request accepted successfully.',
//       data: {
//         requestId,
//       },
//     });
//   } catch (error) {
//     console.error('Error rejecting family request:', error.message);
//     return res.status(500).json({
//       status: 500,
//       message: 'Server error.',
//       data: null,
//       error: error.message,
//     });
//   }
// };

const sendFriendRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    // Validate input
    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Sender ID and Receiver ID are required." });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    // Check if friend request already exists
    const friendRequestExists = receiver.friendRequests.some(
      (request) => request.sender.toString() === senderId && request.status === "pending"
    );
    if (friendRequestExists) {
      return res.status(400).json({ message: "Friend request already sent." });
    }

    // Add friend request to the receiver's friendRequests array
    receiver.friendRequests.push({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
      requestedAt: new Date(),
    });
    await receiver.save();

    return res.status(200).json({ message: "Friend request sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};

const rejectFriendRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    // Validate input
    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Sender ID and Receiver ID are required." });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    // Check if the friend request exists and is pending
    const friendRequestIndex = receiver.friendRequests.findIndex(
      (request) => request.sender.toString() === senderId && request.status === "pending"
    );

    if (friendRequestIndex === -1) {
      return res.status(400).json({ message: "No pending friend request found." });
    }

    // Remove the friend request
    receiver.friendRequests.splice(friendRequestIndex, 1);
    await receiver.save();

    return res.status(200).json({ message: "Friend request rejected successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};

const cancelFriendRequest = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    // Validate input
    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Sender ID and Receiver ID are required." });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    // Find the friend request
    const friendRequestIndex = receiver.friendRequests.findIndex(
      (request) => request.sender.toString() === senderId && request.status === "pending"
    );

    if (friendRequestIndex === -1) {
      return res.status(400).json({ message: "Friend request not found or already handled." });
    }

    // Remove the friend request
    receiver.friendRequests.splice(friendRequestIndex, 1);
    await receiver.save();

    return res.status(200).json({ message: "Friend request canceled successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error." });
  }
};

const removeConnection = async (req, res) => {
  try {
      const userId = req.user.userId;
      const { connectionId } = req.body;

      if (!connectionId) {
          return res.status(400).json({
              statusCode: 400,
              message: "Connection ID is required.",
          });
      }

      // Fetch both the current user and the target user
      const user = await User.findById(userId);
      const targetUser = await User.findById(connectionId);

      if (!user || !targetUser) {
          return res.status(404).json({
              statusCode: 404,
              message: "User or connection not found.",
          });
      }

      // Check if the connection exists in the current user's connections
      if (!user.connections.includes(connectionId)) {
          return res.status(400).json({
              statusCode: 400,
              message: "User is not in your connections list.",
          });
      }

      // Remove connectionId from the current user's connections
      user.connections = user.connections.filter((conn) => conn.toString() !== connectionId);
      await user.save();

      // Remove userId from the target user's connections
      targetUser.connections = targetUser.connections.filter((conn) => conn.toString() !== userId);
      await targetUser.save();

      res.status(200).json({
          statusCode: 200,
          message: "Connection removed successfully from both users.",
      });
  } catch (error) {
      res.status(500).json({
          statusCode: 500,
          message: "Internal server error.",
      });
  }
};

// const getConnections = async (req, res) => {
//   try {
//       const userId = req.user.userId;
//       const user = await User.findById(userId).populate("connections", "full_name");

//       if (!user) {
//           return res.status(404).json({
//               statusCode: 404,
//               message: "User not found.",
//           });
//       }

//       res.status(200).json({
//           statusCode: 200,
//           message: "Connections retrieved successfully.",
//           data: user,
//       });
//   } catch (error) {
//       res.status(500).json({
//           statusCode: 500,
//           message: "Internal server error.",
//       });
//   }
// };
const getConnections = async (req, res) => {
  try {
    const userId = req.user.userId; // From verifyToken middleware
    const user = await User.findById(userId).populate('connections', 'full_name email');

    if (!user) {
      return res.status(404).json({
        statusCode: 404,
        message: 'User not found.',
      });
    }

    // Fetch all users who have family requests from this user (outgoing requests)
    const allUsersWithFamilyRequests = await User.find({
      'familyRequests.sender': userId,
    }).select('familyRequests');

    // Map connections to include family request status
    const connectionsWithStatus = user.connections.map((connection) => {
      // Check if the current user has sent a family request to this connection
      const targetUser = allUsersWithFamilyRequests.find(
        (u) => u._id.toString() === connection._id.toString()
      );

      let familyRequestStatus = 'none'; // Default: no request sent
      if (targetUser) {
        const familyRequest = targetUser.familyRequests.find(
          (req) => req.sender.toString() === userId.toString()
        );
        if (familyRequest) {
          familyRequestStatus = familyRequest.status; // e.g., 'pending', 'accepted', 'declined'
        }
      }

      return {
        userId: connection._id,
        full_name: connection.full_name,
        email: connection.email,
        familyRequestStatus, // Indicates if a family request has been sent
      };
    });

    res.status(200).json({
      status: 200,
      message: 'Connections retrieved successfully.',
      data: connectionsWithStatus,
    });
  } catch (error) {
    console.error('Error fetching connections:', error.message);
    res.status(500).json({
      status: 500,
      message: 'Internal server error.',
      data:null,
      error: error.message,
    });
  }
};

const getMutualFriends = async (req, res) => {
  const { userId, otherUserId } = req.params;

  try {
    // Fetch connections of both users
    const user = await User.findById(userId).select("connections");
    const otherUser = await User.findById(otherUserId).select("connections");

    if (!user || !otherUser) {
      return res.status(404).json({ message: "One or both users not found." });
    }

    // Find mutual friends
    const mutualFriends = user.connections.filter(connection =>
      otherUser.connections.includes(connection.toString())
    );

    // Populate mutual friends' details (optional)
    const populatedMutualFriends = await User.find({ _id: { $in: mutualFriends } }).select(
      "full_name email profilePicture"
    );

    res.status(200).json({ mutualFriends: populatedMutualFriends });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// Delete a family member
const deleteFamilyMember = async (req, res) => {
  try {
    const familyMember = await FamilyMember.findById(req.params.memberId);
    if (!familyMember) {
      return res.status(404).json({
        statusCode: 404,
        message: "Family member not found.",
      });
    }

    // Remove the member reference from the Family document
    const family = await Family.findByIdAndUpdate(
      familyMember.familyId,
      { $pull: { members: req.params.memberId } },
      { new: true }
    );

    if (!family) {
      return res.status(404).json({
        statusCode: 404,
        message: "Family not found.",
      });
    }

    // Unset the familyId in the User document
    // await User.updateOne(
    //   { _id: familyMember.user },
    //   { $unset: { familyId: "" } }
    // );

    // Delete the FamilyMember document
    await familyMember.deleteOne();

    res.status(200).json({
      statusCode: 200,
      message: "Family member deleted successfully.",
    });
  } catch (err) {
    res.status(500).json({
      statusCode: 500,
      message: "Something went wrong!",
      error: err.message,
    });
  }
};

// Update a family member
const updateFamilyMember = async (req, res) => {
  try {
    const { relationship, locationSharing,parameterType,radius, vertices  } = req.body;
    const {memberId} = req.params
    const familyMember = await FamilyMember.findByIdAndUpdate(
      memberId,
      { relationship, locationSharing,parameterType,radius, vertices  },
      { new: true, runValidators: true }
    );

    if (!familyMember) {
      return res.status(404).json({
        statusCode: 404,
        message: "Family member not found.",
      });
    }

    res.status(200).json({
      statusCode: 200,
      message: "Family member updated successfully.",
      data: familyMember,
    });
  } catch (err) {
    res.status(400).json({
      statusCode: 400,
      message: "Something went wrong!",
      error: err.message,
    });
  }
};

const FamilyMemberLocation= async (req, res) => {
  const { lat, lng } = req.body;
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        location: { lat, lng, updatedAt: new Date() },
      },
      { new: true }
    );
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: "Location update failed" });
  }
};

const searchUsers = async (req, res) => {
  try {

    const { q = '', page = 1 } = req.query;
    const limit = 10; 
    const skip = (parseInt(page) - 1) * limit;

    const searchQuery = q
      ? {
          $or: [
            { full_name: { $regex: q, $options: 'i' } }, // Case-insensitive partial match for full_name
            { email: { $regex: q, $options: 'i' } }, // Case-insensitive partial match for email
          ],
        }
      : {};

    const users = await User.find(searchQuery)
      .select('-password -refreshToken -friendRequests -familyRequests -blockedUsers') 
      .limit(limit)
      .lean();

    const totalUsers = await User.countDocuments(searchQuery);

     const totalPages = Math.ceil(totalUsers / limit);
    const currentPage = parseInt(page);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage,
          totalPages,
          totalUsers,
          usersPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while searching users.',
    });
  }
};

const searchConnections = async (req, res) => {
  try {
    // Extract authenticated user (assumes req.user is set by auth middleware)
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: No user ID provided.' });
    }

    // Extract query parameters
    const { q = '', page = 1 } = req.query;
    const limit = 10; // Fixed limit of 10 users per page
    const skip = (parseInt(page) - 1) * limit;

    // Validate page number
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ success: false, message: 'Invalid page number.' });
    }

    // Find the authenticated user to get their connections
    const currentUser = await User.findById(userId).select('connections').lean();
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // If no connections, return empty result
    if (!currentUser.connections || currentUser.connections.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          users: [],
          pagination: {
            currentPage: pageNum,
            totalPages: 0,
            totalUsers: 0,
            usersPerPage: limit,
          },
        },
      });
    }

    // Build search query for connected users
    const searchQuery = {
      _id: { $in: currentUser.connections }, // Limit to users in connections array
      ...(q && {
        $or: [
          { full_name: { $regex: q, $options: 'i' } }, // Case-insensitive partial match for full_name
          { email: { $regex: q, $options: 'i' } }, // Case-insensitive partial match for email
        ],
      }),
    };

    // Execute query with pagination
    const users = await User.find(searchQuery)
      .select('-password -refreshToken -friendRequests -familyRequests -blockedUsers') // Exclude sensitive fields
      .populate({
        path: 'connections',
        select: 'full_name email profilePicture isVerified createdAt updatedAt', // Select specific fields for populated connections
      })
      .skip(skip)
      .limit(limit)
      .lean(); // Convert to plain JavaScript objects for performance

    // Get total count for pagination metadata
    const totalUsers = await User.countDocuments(searchQuery);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUsers / limit);
    const currentPage = pageNum;

    // Return response
    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage,
          totalPages,
          totalUsers,
          usersPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error('Error searching connections:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while searching connections.',
    });
  }
};
module.exports = {
    getUserProfile,
    updateUser,
    addUserLocation,
    getUserNearByLocation,
    blockUser,
    getBlockedUsers,
    unblockUser,
    addUserImageToGallery,
    getUserGallery,
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest,
    cancelFriendRequest,
    removeConnection,
    getConnections,
    getMutualFriends,
    
    
    deleteFamilyMember,
    updateFamilyMember,
    sendFamilyRequest,
    rejectFamilyRequest,
    acceptFamilyRequest,
    searchUsers,
    searchConnections,
    
    FamilyMemberLocation
    
  };