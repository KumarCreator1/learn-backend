// require('dotenv').config({path: './env'})
import dotenv from "dotenv";

dotenv.config({path:'./env'})

import express from "express";
const app = express();

/*

(async () => {
  try {
    mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on('error',(error)=>{
        console.log("ERROR:app not able to talk to DB",error);
        throw error
    
    })
    app.listen(process.env.PORT ,()=>{
        console.log(`app is listening to port${process.env.PORT}`);  
    })
  } catch (error) {
    console.error("ERROR", error);
    throw error;
  }
})();

*/

import connectDB from "./db/index.js";
connectDB();
