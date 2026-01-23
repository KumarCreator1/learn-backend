import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAcessAndRefreshToken = async (userId)=>{
  const retrievedUser = await User.findById(userId)
  const accessToken = user.generateAcessToken();
  const refreshToken = user.generateRefreshToken();
  retrievedUser.refreshToken = refreshToken
  await retrievedUser.save({validateBeforeSave:false})

  return {accessToken,refreshToken}

}


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
  console.log("email:", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all fields required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "user already exist");
  }

  const coverImageLocalPath = req.files?.coverImage[0]?.path;
  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(410, "local upload error:Multer");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath); // check edge case

  if (!avatar) {
    throw new ApiError(410, "avtar upload failed:cludinary");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );
  if (!createdUser) {
    throw new ApiError(500, "failed to register User:Database");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "user registered successfully"));
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
  if (!username || !email) {
    throw new ApiError(401, "username or password is required");
  }
  if (!password) {
    throw new ApiError(401, "password is required");
  }

  const retrievedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!retrievedUser) {
    throw new ApiError(401,"Username or email not found")
  }

  const validationSatatus = await retrievedUser.isPasswordCorrect(password)

  if (!validationSatatus) {
    throw new ApiError(401,"wrong password")
  }

  const {accessToken,refreshToken} = await generateAcessAndRefreshToken(retrievedUser._id)

  

});

export { loginUser };
export { registerUser };
