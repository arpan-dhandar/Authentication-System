import config from "../connfig/config.js"
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
    const accessToken = jwt.sign({
        id: user._id,
    }, config.JWT_SECRET,
        {
            expiresIn: "15m"
        });

    const refreshToken = jwt.sign({
        id: user._id,
    }, config.JWT_SECRET,
        {
            expiresIn: "7d"
        });


    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true, // Set to true in production (requires HTTPS)
        sameSite: "strict", // Adjust based on your needs (e.g., "lax" or "none")
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
        message: "User registered successfully",
        user: {
            username: user.username,
            email: user.email
        },
        token: accessToken
    });
}

export async function getUser(req, res) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized, token is missing"
        })
    }

    const decoded = jwt.verify(token, config.JWT_SECRET)

    const user = await userModel.findById(decoded.id)

    res.status(200).json({
        message: "user fetched successfully",
        user: {
            username: user.username,
            email: user.email
        }
    })
}


export async function refreshToken(req, res) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            message: "Unauthorized, refresh token is missing"
        });
    }

    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

    const accessToken = jwt.sign({
        id: decoded.id,
    }, config.JWT_SECRET, {
        expiresIn: "15m"
    }); 

    const newRefreshToken = jwt.sign({
        id: decoded.id,
    }, config.JWT_SECRET, {
        expiresIn: "7d"
    });

    res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true, // Set to true in production (requires HTTPS)
        sameSite: "strict", // Adjust based on your needs (e.g., "lax" or "none")
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
        message: "Access token refreshed successfully",
        accessToken
    });
}