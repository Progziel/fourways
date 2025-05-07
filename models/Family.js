const mongoose = require('mongoose');

const familySchema = new mongoose.Schema({
  name: { type: String, required: true },
  relation: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Add this field
  familyRequests: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      relationship: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],

});

module.exports = mongoose.model('Family', familySchema);