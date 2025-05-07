const mongoose = require("mongoose");

const familyMemberSchema = new mongoose.Schema(
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      familyId: { type: mongoose.Schema.Types.ObjectId, ref: "Family", required: true },
      relationship: {
        type: String,
        // enum: ["parent", "child", "sibling", "spouse", "other"],
        // default: "other",
      },
      locationSharing: {
        type: Boolean,
        default: false,
      },
      parameterType: {
        type: String,
        enum: ["Circle", "Square", "Custom"],
      
      },
      radius: {
        type: Number,
        // default: 500, // Default radius in meters (e.g., 500m)
      },
      vertices: {
        type: [[Number]], // Array of [lat, lng] coordinates for Custom shape
        default: [], // Empty array for Circle/Square; populated for Custom
      },
    },
    { timestamps: true }
  );
familyMemberSchema.index({ user: 1, family: 1 }, { unique: true });
module.exports = mongoose.model("FamilyMember", familyMemberSchema);
  