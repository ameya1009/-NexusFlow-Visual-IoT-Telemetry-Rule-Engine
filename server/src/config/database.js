const mongoose = require("mongoose");

/**
 * Connect to MongoDB instance.
 * NexusFlow requires MongoDB 5.0+ for Time-Series collections.
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nexusflow";

  try {
    const conn = await mongoose.connect(mongoURI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[Database] MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    // Non-fatal during early dev/mock testing, but logs prominently
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("[Database] MongoDB connection lost. Attempting reconnect...");
});

mongoose.connection.on("error", (err) => {
  console.error(`[Database Error] Connection error: ${err.message}`);
});

module.exports = connectDB;
