const mongoose = require("mongoose");

const MeterTransactionSchema = new mongoose.Schema({
    transactionId: { type: String, required: true },
    chargerId: { type: String, required: true },
    connectorId: { type: String, required: true },
    voltValue: { type: String, required: true },
    ampereValue: { type: String, required: true },
    kwValue: { type: String, required: true },
    whValue: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: false,
    versionKey: false
});


module.exports = mongoose.model("MeterTransaction", MeterTransactionSchema);