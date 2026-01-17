import mongoose, {Schema} from "mongoose";

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // cloudinary / s3 URL
      required: true,
    },

    thumbnail: {
      type: String, // thumbnail image URL
      required: true,
    },

    owner: {
      type:Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    duration: {
      type: Number, // seconds extracted from cloudinary
      required: true,
      min: 1,
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true
  },
);

export const Video = mongoose.model("Video",videoSchema)
