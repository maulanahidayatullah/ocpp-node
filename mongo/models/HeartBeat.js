const mongoose = require("mongoose");

const HeartBeatSchema = new mongoose.Schema({
    chargerId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: false,
    versionKey: false
});


module.exports = mongoose.model("HeartBeat", HeartBeatSchema);