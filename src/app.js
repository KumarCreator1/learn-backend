import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// app.use() used for middleware/onfiguration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    sucessflag: 200,
  }),
);

app.use(cookieParser());

// Native express config. Middlewares
// 1. config limit of data coming in JSON
app.use(
  express.json({
    limit: "16kb",
  }),
);

//2. data is coming from url so url encoding
app.use(urlencoded({ inflate: "16kb", extended: true }));

// 3. Do not disturb server for Static files and images
app.use(express.static("public")); //fetch it from public dir

// Routes
import userRouter from "./routes/user.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter);

export { app };
