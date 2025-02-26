const mongoose = require("mongoose");

const ChargerPointSchema = new mongoose.Schema({
    chargerPointModel: { type: String, required: true },
    chargerPointVendor: { type: String, required: true },
    chargerId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: false,
    versionKey: false
});


module.exports = mongoose.model("ChargerPoint", ChargerPointSchema);