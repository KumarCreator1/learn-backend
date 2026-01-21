import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, 
});

// Upload 
const uploadOnClodinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        const uploadResponse = await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"})
        console.log("File uploaded on cloudinary",uploadResponse.url);
        return uploadResponse
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove crupted files to clean main server as upload is failed
        return null
    }
}

export {uploadOnClodinary}
