const mongoose = require("mongoose");

const connectDB = async () => {
    const MONGO_URI = "mongodb://localhost:27017/ocpp";
    mongoose.connect(MONGO_URI)
        .then(() => console.log("MongoDB Connected"))
        .catch((err) => console.error("MongoDB Connection Error:", err));
};

module.exports = connectDB;