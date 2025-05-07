const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    full_name: {
      type: String,
      required: [true, "Please Provide Full Name."],
    },
     email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      validate: {
        validator: function (value) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: (props) => `${props.value} is not a valid email address!`,
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    tagline:{
      type: String,
      default:"What is in your mind?"
    },
    bio:{
      type: String,
    },
    isInvisible:{
      type: Boolean,
      default: false,
    },
    hideFriends:{
      type: Boolean,
      default: false,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    coverPhoto: {
      type: String,
      default: "",
    },
    refreshToken: {
      type: String,
      default: "",
    },
    phone:{
      type: String,
    },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [] },
      address: { type: String }
    },
    address:{
      type: String,
    },
    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Family",
    },
    friendRequests: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // User who sent the request
        },
        receiver: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User", // User who is receiving the request
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"], 
          default: "pending",
        },
        requestedAt: {
          type: Date,
          default: Date.now, 
        },
      },
    ],
    familyRequests: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        relationship: { type: String, required: true },
        status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
        requestedAt: { type: Date, default: Date.now },
      },
    ],
    connections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
     blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);