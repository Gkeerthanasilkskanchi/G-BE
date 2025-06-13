import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req:any, file:any, cb:any) {
    cb(null, "uploads");
  },
  filename: function (req:any, file:any, cb:any) {
    cb(null, file.originalname);
  }
});

export const upload = multer({ storage });
