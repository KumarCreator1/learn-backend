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
      (field) => typeof field === "string" && field.trim().length > 0,
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
    throw new ApiError(410, "avatar upload failed:cloudinary");
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

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "user registered successfully"));
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
    throw new ApiError(401, "username or email is required");
  }
  if (!password) {
    throw new ApiError(401, "password is required");
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

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    retrievedUser._id,
  );

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
        "user logged in successfully",
      ),
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
    },
  );

  const option = {
    httpOnly: true,
    secure: true,
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
    throw new ApiError(401, "unauthrized request:no token");
  }

  let decodedPayload;
  try {
    decodedPayload = jwt.verify(
      incomingToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch (error) {
    throw new ApiError(401, "invalid or expired refresh token");
  }

  const retrievedUser = await User.findById(decodedPayload?._id).select(
    "-password",
  );

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

  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessAndRefreshToken(retrievedUser._id);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "access token renewed successfully",
      ),
    );
});

export { loginUser, registerUser, logOutUser, renewAccessToken };
