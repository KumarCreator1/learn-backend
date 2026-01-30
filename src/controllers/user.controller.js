import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const registerUser = asyncHandler(async (req, res) => {
  // take payload from frontend
  // process/validation - not empty
  // check if user already exists - username + email
  // check files - avatar(must) , cover image
  // upload files to cloudinary - res.url
  // check avtar upload status - must true
  // create user object - create entry in DB
  // remove password and refreshToken from response
  // check for user creation - must true
  // return res
  // register in DB
  // clear route - rediraction - success message

  const { fullName, email, username, password } = req.body;

  if (
    ![fullName, email, username, password].every(
      (field) => typeof field === "string" && field.trim().length > 0
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "user already exist");
  }

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "local upload error:Multer ,do provide files");
  }

  let avatar;
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
  } catch (error) {
    throw new ApiError(500, "avatar upload failed:cloudinary");
  }

  if (!avatar?.url) {
    throw new ApiError(500, "avatar upload failed:cloudinary");
  }

  let coverImageUrl = "";
  if (coverImageLocalPath) {
    try {
      const coverImage = await uploadOnCloudinary(coverImageLocalPath);
      coverImageUrl = coverImage?.url || "";
    } catch (error) {
      throw new ApiError(500, "coverimage upload failed:cloudinary");
    }
  }

  let user;
  try {
    user = await User.create({
      username: username.toLowerCase(),
      email,
      fullName,
      avatar: avatar.url,
      coverImage: coverImageUrl,
      password,
    });
  } catch (error) {
    throw new ApiError(500, "failed to register user in DB:at final stage");
  }

  const createdUser = user.toObject();
  delete createdUser.password;
  delete createdUser.refreshToken;

  return res.status(201).json(new ApiResponse(201, createdUser, "user registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req.body -> take username password email
  // check edge case - empty credentials
  // finde the document in UserSchema - throw error if not found
  // validate the password with UserSchema
  // Two cases arise 1. wrong info 2. right info
  // if case 1
  // throw error
  // if case 2
  // give access token
  // generate refresh token
  // store in DB
  // send it to user cookies

  const { username, email, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }
  if (!password) {
    throw new ApiError(400, "password is required");
  }

  const retrievedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!retrievedUser) {
    throw new ApiError(401, "Username or email not found");
  }

  const validationStatus = await retrievedUser.isPasswordCorrect(password);

  if (!validationStatus) {
    throw new ApiError(401, "wrong password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(retrievedUser._id);

  const loggedInUser = retrievedUser.toObject();
  delete loggedInUser.password;
  delete loggedInUser.refreshToken;

  const option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "user logged in successfully"
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const option = {
    httpOnly: true,
    secure: true,
    path: "/",
  };

  return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "user logged out successfully"));
});

const renewAccessToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingToken) {
    throw new ApiError(401, "unauthorized request:no token");
  }

  let decodedPayload;
  try {
    decodedPayload = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "invalid or expired refresh token");
  }

  const retrievedUser = await User.findById(decodedPayload?._id).select("-password");

  if (!retrievedUser) {
    throw new ApiError(401, "user not found");
  }

  if (retrievedUser.refreshToken !== incomingToken) {
    throw new ApiError(401, "invalid refresh token");
  }

  const options = {
    httpOnly: true,
    secure: true,
  };

  const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(
    retrievedUser._id
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "access token renewed successfully"
      )
    );
});

const updatePassword = asyncHandler(async (req, res) => {
  const { password, newPassword } = req.body;
  if (!newPassword || !password) {
    throw new ApiError(400, "old password and new password are required");
  }

  const retrievedUser = await User.findById(req.user._id);

  const isPasswordCorrect = await retrievedUser.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is not correct");
  }

  retrievedUser.password = newPassword;
  await retrievedUser.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, {}, "password updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalFilePath = req.file?.path;

  if (!avatarLocalFilePath) {
    throw new ApiError(400, "avatar file not found:multer,please provide files");
  }

  let avatarFileUrl;
  try {
    const uploadedAvatar = await uploadOnCloudinary(avatarLocalFilePath);
    avatarFileUrl = uploadedAvatar?.url;
  } catch (error) {
    throw new ApiError(500, "An error occured while uploading to cloudinary:updateAvatar");
  }

  if (!avatarFileUrl) {
    throw new ApiError(500, "couldn't get url for avatar:cloudinary");
  }

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        avatar: avatarFileUrl,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { avatar: avatarFileUrl }, "avatar uploaded successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;

  return res.status(200).json(new ApiResponse(200, user, "current user fetched successfully"));
});

const updateProfile = asyncHandler(async (req, res) => {
  // Get current user
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { fullName, username, email, password } = req.body;
  const avatarFile = req.files?.avatar?.[0];
  const coverImageFile = req.files?.coverImage?.[0];

  // Validate new email if provided
  if (email && email !== user.email) {
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      throw new ApiError(409, "Email already in use");
    }
  }

  // Validate new username if provided
  if (username && username !== user.username) {
    const usernameExists = await User.findOne({
      username: username.toLowerCase(),
    });
    if (usernameExists) {
      throw new ApiError(409, "Username already taken");
    }
  }

  // Build update object with only provided fields
  const updateData = {};

  if (fullName && fullName.trim()) {
    updateData.fullName = fullName.trim();
  }

  if (username && username.trim()) {
    updateData.username = username.toLowerCase().trim();
  }

  // Handle password change with old password verification
  if (password) {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new ApiError(400, "Both old and new password are required to change password");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new ApiError(401, "Old password is incorrect");
    }

    updateData.password = newPassword;
  }

  // Handle email change - update will be pending verification
  if (email && email !== user.email) {
    // In a real scenario, you'd send a verification email
    // For now, directly update (in production add email verification)
    updateData.email = email.toLowerCase().trim();
    updateData.isEmailVerified = false; // Mark as unverified until they confirm
    // In real app: send verification email and set emailVerificationToken
  }

  // Handle avatar upload
  if (avatarFile) {
    try {
      const uploadedAvatar = await uploadOnCloudinary(avatarFile.path);
      if (!uploadedAvatar?.url) {
        throw new ApiError(500, "Avatar upload failed");
      }
      updateData.avatar = uploadedAvatar.url;
    } catch (error) {
      throw new ApiError(500, "Error uploading avatar to cloudinary");
    }
  }

  // Handle cover image upload
  if (coverImageFile) {
    try {
      const uploadedCoverImage = await uploadOnCloudinary(coverImageFile.path);
      if (!uploadedCoverImage?.url) {
        throw new ApiError(500, "Cover image upload failed");
      }
      updateData.coverImage = uploadedCoverImage.url;
    } catch (error) {
      throw new ApiError(500, "Error uploading cover image to cloudinary");
    }
  }

  // If nothing to update
  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No fields provided to update");
  }

  // Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateData },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedUser,
        "Profile updated successfully. Please verify your email if it was changed."
      )
    );
});

export {
  loginUser,
  registerUser,
  logOutUser,
  renewAccessToken,
  updatePassword,
  updateAvatar,
  getCurrentUser,
  updateProfile,
};
