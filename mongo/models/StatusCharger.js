const mongoose = require("mongoose");

const StatusChargerSchema = new mongoose.Schema({
    chargerId: { type: String, required: true },
    errorCode: { type: String, required: true },
    status: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: false,
    versionKey: false
});


module.exports = mongoose.model("StatusCharger", StatusChargerSchema);