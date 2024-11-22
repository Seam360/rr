import express, { Router } from "express";
import {
  getAllUsers,
  checkAuthStatus,
  registerUser,
  verifyOTP,
  authenticateUser,
  editUserProfile,
  requestEmailUpdateOTP,
  verifyPassword,
  confirmEmailUpdate,
  forgotPasswordOTPsend,
  resetPasssword,
  matchForgotPasswordOTP,
  resendOtp,
  logout,
} from "./users.controllers";
import { verifyUser } from "../../middleware/verifyUser";

const router: Router = express.Router();

router.get("/", getAllUsers);

router.get("/check", checkAuthStatus);
// router.post("/logout", logout);

router.post("/register", registerUser);

router.post("/verify-otp", verifyOTP);
router.post("/resendotp", resendOtp);
router.post("/login", authenticateUser);
router.patch("/update-profile", verifyUser, editUserProfile);
router.post("/logout", logout);
//update email
router.post("/verify-password", verifyUser, verifyPassword);
router.post("/request-email-update-otp", verifyUser, requestEmailUpdateOTP);
router.patch("/confirm-email-update", verifyUser, confirmEmailUpdate);

router.post("/request-forgot-password-otp", verifyUser, forgotPasswordOTPsend);
router.post("/match-password-otp", verifyUser, matchForgotPasswordOTP);
router.patch("/reset-forgot-password", verifyUser, resetPasssword);

export default router;
