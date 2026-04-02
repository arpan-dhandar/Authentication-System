import config from "../connfig/config.js"
import userModel from "../models/user.model.js";
import crypto from "crypto"
import jwt from "jsonwebtoken"
import sessionModel from "../models/session.model.js";    
import { sendEmail } from "../services/email.service.js";  
import otpModel from "../models/otp.model.js";
import { generateOtp, getOtpHtml } from "../utils/genrateOtp.util.js";



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

   const otp = generateOtp();
   const optHtml = getOtpHtml(otp);

   const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
   await otpModel.create({
    email,
    user: user._id,
    otpHash
   });

   await sendEmail({email, subject: "OTP Verification", text: `Your OTP code is ${otp}`, html: optHtml});

   

    res.status(201).json({
        message: "User registered successfully",
        user: {
            username: user.username,
            email: user.email,
            verified: user.verified
        }
    });
}

export async function login(req, res) {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password"
        });
    }

    if (!user.verified) {
        return res.status(400).json({
            message: "Please verify your email before logging in"
        });
    }
    
    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

    if (hashedPassword !== user.password) {
        return res.status(400).json({
            message: "Invalid email or password"
        });
    }

    const refreshToken = jwt.sign({
        id: user._id,
    }, config.JWT_SECRET, {
        expiresIn: "7d"
    });

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.create({
        user: user._id,
        refreshTokenHash,
        ip: req.ip,
        userAgent:req.headers[ "user-agent"]
    })

    const accessToken = jwt.sign({
        id: user._id,
        sessionId: session._id
    }, config.JWT_SECRET, {
        expiresIn: "15m"
    });

    res.status(200).cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
        message: "Logged in successfully",
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

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.findOne({    
        refreshTokenHash,
        revoked: false
    });
    if (!session) {
        return res.status(401).json({
            message: "Unauthorized, invalid refresh token"
        });
    }


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

    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    session.refreshTokenHash = newRefreshTokenHash;
    await session.save();

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

export async function logout(req, res) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        res.status(400).json({
            message: "Refresh token not found"
        })
    }

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.findOne({
        refreshTokenHash,
        revoked: false
    })

    if (!session) {
        return res.status(400).json({
            message: "Invalid refresh token"
        })
    }

    session.revoked = true;
    await session.save();

    res.status(200).json({
        message: "Logged out successfully"
    })

}

export async function logoutAll(req, res) {
    refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        res.status(400).json({
            message: "Refresh token not found"
        })
    }

    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);

    await sessionModel.updateMany({
        user: decoded.id,
        revoked: false
    }, {
        revoked: true
    });

    res.clearCookie("refreshToken")

    res.status(200).json({
        message: "Logged out from all sessions successfully"
    })
}

export async function verifyEmail(req, res) {
    const { email, otp } = req.body;

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const otpDoc = await otpModel.findOne({
        email,
        otpHash
    })

    if (!otpDoc) {
        return res.status(400).json({
            message: "Invalid OTP"
        })
    }

    const user = await userModel.findByIdAndUpdate(otpDoc.user, {
        verified: true
    })

    await otpModel.deleteMany({
        user: otpDoc.user
    })

    return res.status(200).json({
        message: "Email verified successfully",
    user:{
        username: user.username,
        email: user.email,
        verified: user.verified
    }
    })  
    
}