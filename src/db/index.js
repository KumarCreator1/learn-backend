import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const DbConnectionInstaance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`,
    );
    console.log(
      `MongoDB connection successful ${DbConnectionInstaance.connection.host}`,
    );
  } catch (err) {
    console.log(`MongoDB connection error:`, err);
    process.exit(1);
  }
};

export default connectDB;
