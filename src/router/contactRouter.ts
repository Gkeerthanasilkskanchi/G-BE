import express from "express";
import { registerUser, loginUser, getUser } from "../service/authService";
import { addOrder, addToCartService, createProduct, deleteProduct, fetchProductById, fetchProducts, getCart, getFilteredProduct, getLikedProducts, likeProductService, sendQuery, updateProduct } from "../service/productService";
import { createOrder, editProduct } from "../repository/contactRepo";
import { upload } from "./middleware";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/products",upload.single('image'), createProduct);     
router.get("/products/:email", fetchProducts);     
router.post("/like", likeProductService);
router.get("/likes/:userId", getLikedProducts);

router.post("/cart", addToCartService);
router.get("/cart/:userId", getCart);


router.post('/send-query',sendQuery)

router.post('/send-review',sendQuery)
router.post('/send-subscribtion',sendQuery)
router.get('/get-user-list',getUser);
router.post("/create-order", addOrder);

router.get('/deleteProduct/:id',deleteProduct);
router.get('/getProductById/:id',fetchProductById);
router.post('/editProduct',upload.single('image'),updateProduct);
router.get('/getFilteredProduct', getFilteredProduct);
export { router as userRoutes };
