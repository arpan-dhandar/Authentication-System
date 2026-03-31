import mongoose from "mongoose";
import config from "../connfig/config.js";

async function connectDB() {
    
    await mongoose.connect(config.MONGODB_URI)
    console.log("Connected to DB");
    
}

export default connectDB;