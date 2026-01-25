import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "unauthrized request");
    }

    const decodedPayload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const retrievedUser = await User.findById(decodedPayload?._id).select(
      "-password -refreshToken",
    );

    if (retrievedUser) {
      throw new ApiError(401, "user not found");
    }

    req.user = retrievedUser;
    next();
  } catch (error) {
    throw new ApiError(
      401,
      error?.message || "An error occured while verifyingJWT",
    );
  }
});
export { verifyJWT };
