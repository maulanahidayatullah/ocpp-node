const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: false,
    versionKey: false
});


module.exports = mongoose.model("Test", TestSchema);