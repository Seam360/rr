import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
 
import session from "express-session";
import cookieParser from "cookie-parser";

import users from "./modules/users/users.routes";


dotenv.config();

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("dev"));

// app.use(fileUpload({
//   useTempFiles: true
// }));

app.use(
  session({
    secret: "changeit",
    resave: false,
    saveUninitialized: false,
    // cookie: { maxAge: 600000 },
  })
);

app.use("/users", users);


app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    message: `404 route not found`,
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    message: `500 Something broken!`,
    error: err.message,
  });
});

export default app;
