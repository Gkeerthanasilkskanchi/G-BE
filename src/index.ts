import express from "express";
import dotenv from "dotenv";
import { userRoutes } from "./router/contactRouter";
import cors from "cors";
import path from "path";

dotenv.config();
const app = express();
const port = process.env.PORT || 8081;

app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));
app.use("/users", userRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));


app.use((err:any, req:any, res:any, next:any) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
