const mongoose = require('mongoose');

const DetailSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    }
});

const TopicSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true
    },
    details: [DetailSchema]
});

const ResourceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    link: {
        type: String,
        required: true
    }
});

const CourseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    imageURL: {
        type: String,
        required: true
    },
    category: {
        type: String
    },
    topics: [TopicSchema],
    online_resources: {
        websites: [ResourceSchema],
        youtube_channels: [ResourceSchema]
    },
    instructor: {
        type: String
    },
    level: {
        type: String
    }
}, {
    timestamps: true // Adds createdAt and updatedAt timestamps
});

module.exports = mongoose.model('Course', CourseSchema);