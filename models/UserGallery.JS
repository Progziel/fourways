const mongoose = require('mongoose');

const UserGallerySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    imagePath: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('UserGallery', UserGallerySchema);