const mongoose = require('mongoose');

const BoardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        default: 'Untitled Board'
    },
    // Store drawing data as an array of objects
    elements: [{
        type: {
            type: String, // 'path', 'rectangle', 'circle', 'stickyNote'
            required: true
        },
        path: {
            type: String, // SVG path string or JSON string of points for freehand
        },
        x: Number,
        y: Number,
        width: Number,
        height: Number,
        color: String, // Stroke color
        fillColor: String, // Fill color for shapes
        lineWidth: Number,
        text: String, // For sticky notes
        id: String // Unique ID for each element
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Board', BoardSchema);