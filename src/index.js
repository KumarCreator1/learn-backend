// require('dotenv').config({path: './env'})
import dotenv from "dotenv";

dotenv.config({ path: "./env" });

import { app } from "./app.js";

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
connectDB()
  .then(() => {
    const server = app.listen(process.env.PORT || 8000, () => {
      console.log(`server is running at port : ${process.env.PORT}`);
    });
    app.on("error", (error) => {
      console.log(`an error occured during server starting...`, error);
    });
    app.on("close", () => {
      console.log("server is stopped !");
    });
  })
  .catch((err) => {
    console.log("MONGODB connection failed !!", err);
  });
