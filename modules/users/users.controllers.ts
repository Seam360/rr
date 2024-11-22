import dotenv from "dotenv";
import { Request, Response } from "express";
import { isEmail } from "validator";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { sign, verify } from "jsonwebtoken";

import User from "./users.models";
 
import {
  generateOTP,
  sendForgotPasswordOTP,
  sendRegistrationOTPEmail,
  sendUpdateEmailOTP,
} from "../../util/otpUtils";

dotenv.config();

declare module "express-session" {
  interface SessionData {
    otp: string;
    userData?: {
      name: string;
      password: string;
      email: string;
      role: string
    };
    email?: string;
    isOtpValid: Boolean;
  }
}

interface CustomRequest extends Request {
  userId?: string;
}

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 8;  
  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  } catch (error) {
    throw new Error('Error hashing password');
  }
}

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let user = await User.find();

    const token = req.cookies.authToken;
    console.log(token);

    res.status(200).json(user);
  } catch (error) {
    console.log(error);
  }
};

// export const registerUser = async (
//   req: Request,
//   res: Response
// ): Promise<void> => {
//   try {
//     let { name, email, password } = req.body;

//     if (!(name && email && password)) {
//       res.status(400).json({
//         message: "Please fill all required fields",
//       });
//       return;
//     }

//     name = name.replace(/\s+/g, " ").trim();

//     // email management.....
//     const exuser = await User.findOne({ email });
//     if (exuser) {
//       res.status(400).json({ message: "Email already exists" });
//       return;
//     }
//     if (!isEmail(email)) {
//       res.status(400).json({
//         message: "Please enter a valid email address",
//       });
//       return;
//     }
//     if (email === name) {
//       res.status(400).json({
//         message: "Email cannot be the same as your username",
//       });
//       return;
//     }

//     if (password.length < 6) {
//       res.status(400).json({
//         message: "Password must be longer than 6 characters",
//       });
//       return;
//     }
//     if (password === userName || password === email) {
//       res.status(400).json({
//         message: "Password cannot be the same as your username or email",
//       });
//       return;
//     }

//     // password encryption
//     const salt = await bcrypt.genSalt(10);
//     password = await bcrypt.hash(password, salt);

//     // generate OTP......
//     const OTP = generateOTP();

//     // Save user data and OTP in session
//     req.session.otp = OTP;
//     req.session.userData = { userName, password, email };

//     console.log(req.session.userData)

//     // Send registration OTP email
//     await sendRegistrationOTPEmail(userName, email, OTP);

//     res.status(200).json({ message: "OTP sent successfully" });
//   } catch (error) {
//     res.status(500).json(error.message);
//   }
// };

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    let { name, email, password, role } = req.body;

    // Check if all required fields are present
    if (!(name && email && password && role)) {
      res.status(400).json({
        message: "Please fill all required fields",
      });
      return;
    }

    name = name.replace(/\s+/g, " ").trim();

    // Validate email and password before doing any async operations
    if (!isEmail(email)) {
      res.status(400).json({
        message: "Please enter a valid email address",
      });
      return;
    }
    if (email === name) {
      res.status(400).json({
        message: "Email cannot be the same as your name",
      });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({
        message: "Password must be longer than 6 characters",
      });
      return;
    }
    if (password === name || password === email) {
      res.status(400).json({
        message: "Password cannot be the same as your name or email",
      });
      return;
    }

    // Parallelize database query and password hashing
    const [exuser, hashedPassword, OTP] = await Promise.all([
      User.findOne({ email }), 
      bcrypt.hash(password, 8),
      generateOTP(), 
    ]);

    // Check if user already exists
    if (exuser) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    // Store user data and OTP in session
    req.session.otp = OTP;
    req.session.userData = { name, password: hashedPassword, email, role };

    console.log(req.session.userData);

    // Send OTP email in the background (don't await)
    sendRegistrationOTPEmail(name, email, OTP)
      .then(() => console.log("OTP email sent"))
      .catch((err) => console.error("Error sending OTP email:", err));

    // Respond immediately after OTP is generated
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userData } = req.session;

    if (!userData?.email || !userData?.name) {
      res.status(400).json({ message: "User data not found in session" });
      return;
    }

    const OTP = generateOTP();
    req.session.otp = OTP;

    // Send OTP email in the background (non-blocking)
    sendRegistrationOTPEmail(userData.name, userData.email, OTP)
      .then(() => console.log("OTP email sent"))
      .catch((err) => console.error("Error sending OTP email:", err));

    // Respond immediately without waiting for email to be sent
    res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { otp } = req.body;
//     console.log(otp);
//     // console.log(req.session.otp, req.session);

//     // Check if userData exists and has required fields

//     if (
//       !req.session.userData ||
//       !req.session.userData.name ||
//       !req.session.userData.email ||
//       !req.session.userData.password
//     ) {
//       res.status(400).json({
//         message: "Registration incomplete",
//       });
//       return;
//     }

//     if (otp !== req.session.otp) {
//       console.log("error");
//       res.status(400).json({
//         message: "Invalid OTP",
//       });
//       return;
//     }

//     // Create a new User instance
//     const newUser = new User(req.session.userData);

//     // Generate JWT token
//     const token = sign(
//       { userEmail: newUser.email, userId: newUser._id },
//       process.env.WEBTOKEN_SECRET_KEY as string,
//       { expiresIn: "4h" }
//     );

//     // Save the new user
//     await newUser.save();

//     // Clear session data after successful save
//     delete req.session.userData;
//     delete req.session.otp;

//     const options = {
//       expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
//       httpOnly: true,
//     };
//     res
//       .status(200)
//       .cookie("token", token, options)
//       .json({ token, user: newUser });
//   } catch (error) {
//     res.status(500).json(error.message);
//   }
// };

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { otp } = req.body;

    // Early exit if session or required user data is missing
    if (
      !req.session.userData ||
      !req.session.userData.name ||
      !req.session.userData.email ||
      !req.session.userData.password
    ) {
      res.status(400).json({
        message: "Registration incomplete",
      });
      return;
    }

    // Early exit if OTP is invalid
    if (otp !== req.session.otp) {
      res.status(400).json({
        message: "Invalid OTP",
      });
      return;
    }

    // Create new User and generate JWT token in parallel
    const newUser = new User(req.session.userData);

    // Generate JWT and save the user simultaneously
    const [savedUser, token] = await Promise.all([
      newUser.save(), // Save the new user to the database
      sign(
        { userEmail: newUser.email, userId: newUser._id },
        process.env.WEBTOKEN_SECRET_KEY as string,
        { expiresIn: "1d" }
      ),
    ]);

    // Clear session data after successful save
    delete req.session.userData;
    delete req.session.otp;

    // Set cookie options
    const options = {
      expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };

    // Send response with token and user
    res
      .status(200)
      .cookie("token", token, options)
      .json({ token, user: savedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const authenticateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log(email, password);

    if (!email || !password) {
      res.status(400).json({ message: "Please fill all required fields" });
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({ message: "User not found!" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      res.status(400).json({ message: "Invalid email or password" });
      return;
    }

    const token = sign(
      { userEmail: user.email, userId: user._id },
      process.env.WEBTOKEN_SECRET_KEY as string,
      { expiresIn: "1d" } // Token expires in 10 minutes
    );

    const options = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("token", token, options)
      .json({ message: "Login successful", user, token });
  } catch (error) {
    res.status(500).json(error.message);
  }
};


export const editUserProfile = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    if (req.body.password) {
      req.body.password = await  hashPassword(req.body.password);
    }
    const updatedUser = await User.findByIdAndUpdate(req.userId, req.body, {
      new: true,
    });

    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const verifyPassword = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        message: `password is empty`,
      });
      return;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(400).json({
        message: `User not found`,
      });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      res.status(400).json({
        message: "password dose not match",
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: "password is match",
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

//email change
export const requestEmailUpdateOTP = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      res.status(400).json({
        message: `User not found`,
      });
      return;
    }
    if (email === user.email) {
      res.status(400).json({
        message: `It's your current email`,
      });
      return;
    }

    const exuser = await User.findOne({ email });
    if (exuser) {
      res
        .status(400)
        .json({ message: "This email already exists with another account" });
      return;
    }

    if (!isEmail(email)) {
      res.status(400).json({
        message: "Please enter a valid email address",
      });
      return;
    }

    const otp = generateOTP();

    req.session.otp = otp;
    req.session.email = email;

    // Send update email OTP
    await sendUpdateEmailOTP(user.name, email, otp);

    res.status(200).json({ message: "OTP sent successfully for email change" });
  } catch (error) {
    res.status(500).json(error);
  }
};

export const confirmEmailUpdate = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    console.log(req.session.otp);
    const { otp } = req.body;

    if (otp !== req.session.otp) {
      res.status(400).json({ message: "Invalid OTP" });
      return;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      res.status(400).json({ message: `User not found` });
      return;
    }

    if (!req.session.email) {
      res.status(400).json({ message: "Email not found in session" });
      return;
    }

    user.email = req.session.email;

    delete req.session.otp;
    delete req.session.email;

    const updatedUser = await user.save();
    res.status(201).json(updatedUser);
  } catch (error) {
    res.status(500).json(error);
  }
};

//password change
export const forgotPasswordOTPsend = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({
        message: `User not found`,
      });
      return;
    }
    const otp = generateOTP();

    req.session.otp = otp.toString();
    req.session.email = user.email;

    await sendForgotPasswordOTP(user.name, user.email, otp);

    res
      .status(200)
      .json({ message: "OTP send Successfull for change password" });
  } catch (error) {
    res.status(500).json(error);
  }
};

export const matchForgotPasswordOTP = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    const { otp } = req.body;
    console.log(req.session.otp);

    if (!otp) {
      res.status(400).json({
        message: `OTP is requird`,
      });
      return;
    }

    if (otp !== req.session.otp || otp === undefined) {
      res.status(400).json({
        message: `OTP Not metch`,
      });
      return;
    }

    req.session.isOtpValid = true;

    res.status(200).json({
      success: true,
      message: "OTP metch successfully",
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

export const resetPasssword = async (
  req: CustomRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.session.isOtpValid) {
      res.status(400).json({ message: "OTP validation required" });
      return;
    }

    const email = req.session.email;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(400).json({
        message: `User not found`,
      });
      return;
    }

    let { password, conformPassword } = req.body;

    if (!password || !conformPassword) {
      res.status(400).json({
        message: "Please fill all required fields",
      });
      return;
    }
    if (password !== conformPassword) {
      res.status(400).json({
        message: "Password does not match confirm password",
      });
      return;
    }

    // password encryption
    const salt = await bcrypt.genSalt(10);
    password = await bcrypt.hash(password, salt);

    user.password = password;

    const token = sign(
      { userEmail: user.email, userId: user._id },
      process.env.WEBTOKEN_SECRET_KEY as string,
      { expiresIn: "4h" }
    );

    const updatedUser = await user.save();

    // Clear session data after successful save
    delete req.session.email;
    delete req.session.otp;
    delete req.session.isOtpValid;

    res.status(200).json({ token, updatedUser });
  } catch (error) {
    res.status(500).json(error);
  }
};

// export const getUserProfile = async

// if (req.files && req.files.image) {
// try {
//   const uploadedImage = req.files.image as UploadedFile;
//   const base64Data = `data:${uploadedImage.mimetype};base64,${uploadedImage.data.toString("base64")}`;

//   // Upload an image
//   const uploadResult = await cloudinary.v2.uploader.upload(base64Data, {
//     folder: "user_images", // Optional: specify a folder in your Cloudinary account
//   });

//   console.log(uploadResult);
//   user.image = uploadResult.secure_url; // Assuming you want to store the image URL in your user document
// } catch (error) {
//   console.log(error);
//   res.status(500).json({ message: "Image upload failed", error });
//   return;
// }
// }

// // https://chatgpt.com/c/ec2c1b94-fa7a-4b41-ac7f-76c4a587c6c6

// // https://console.cloudinary.com/pm/c-b9e19ca2749732b91448766c3fd435/getting-started

// // Upload an image
// const uploadResult = await cloudinary.uploader.upload(
//   `data:image/jpeg;base64,${uploadedImage.data.toString("base64")}`,
//   {folder: "user_images"},
// );

// console.log(uploadResult);


export const checkAuthStatus = async (req: Request, res: Response): Promise<void> => {

  const JWT_SECRET = process.env.WEBTOKEN_SECRET_KEY as string;

  try {
    const { token } = req.cookies;

    if (!token) {
      res.status(400).json({ authenticated: false });
      return;
    }

    verify(token, JWT_SECRET, async (err: any, decoded: any) => {
      if (err) {
        return res
          .status(401)
          .json({ message: "Invalid token", authenticated: false });
      }

      const userId = decoded.userId;

      const userInfo = await User.findById(userId);
      if (!userInfo) {
        return res
          .status(404)
          .json({ message: "User not found", authenticated: false });
      }


      return res.status(200).json({ authenticated: true, user: userInfo });
    });
  } catch (error) {
    console.error("Error in checkAuthStatus:", error);
    res.status(500).json({ message: "Internal server error" });
  }

}

export const logout = (req: Request, res: Response) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(400).json(error.message);
  }
};
