import { Router } from "express";
import {
  loginUser,
  logOutUser,
  registerUser,
  renewAccessToken,
  updateProfile,
  getCurrentUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//secured route
router.route("/logout").post(verifyJWT, logOutUser);
router.route("/renew-access-token").post(verifyJWT, renewAccessToken);

// Unified profile update route - handles all profile fields
router.route("/update-profile").patch(
  verifyJWT,
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  updateProfile
);

router.route("/me").get(verifyJWT, getCurrentUser);

export default router;
