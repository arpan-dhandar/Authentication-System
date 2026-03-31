import config from "../connfig/config.js" // 1. Fixed import (import the default export)
import userModel from "../models/user.model.js";
import crypto from "crypto"
import jwt from "jsonwebtoken"

export async function register(req, res) {
    const { username, email, password } = req.body;
    
    // 2. Fixed Case: Changed UserModel to userModel to match your import
    const isAlreadyRegistered = await userModel.findOne({
        $or: [
            { username },
            { email }
        ]
    });

    // 3. Logic Fix: If user EXISTS, then return error (removed '!')
    if (isAlreadyRegistered) { 
        return res.status(400).json({ // Use 400 (Bad Request) for existing users
            message: "Username or email already exist"
        });
    }

    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

    const user = await userModel.create({
        username,
        email,
        password: hashedPassword
    });

    // 4. Reference Fix: Use config.JWT_SECRET (matching your import)
    const token = jwt.sign({
        id: user._id,
    }, config.JWT_SECRET, 
    {
        expiresIn: "1d"
    });

    res.status(201).json({
        message: "User registered successfully",
        user: {
            username: user.username,
            email: user.email
        },
        token
    });
}