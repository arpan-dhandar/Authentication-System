import dotenv from 'dotenv';

dotenv.config();

if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
}

if (!process.env.PORT) {
    throw new Error("PORT is not defined in environment variables");
}

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables")
}

const config = {    
    MONGODB_URI: process.env.MONGODB_URI,
    PORT: process.env.PORT,
    JWT_SECRET: process.env.JWT_SECRET
};
export default config;