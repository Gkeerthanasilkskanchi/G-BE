import { Request, Response, NextFunction } from "express";
import { addProduct, createOrder, editProduct, getAllProductsWithFlags, getFilteredProductFromDB,getProductsByCategoryFromDB, getProductById,getUniqueProductCategoriesFromDB, getUserByEmail, updateProductStatus } from "../repository/contactRepo"; // or productRepo.ts
import { likeProduct, getLikedProductsByUser, addToCart, getCartByUser, getUserIdByEmail } from "../repository/contactRepo";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

// Add a new product
export const createProduct = async (req: any, res: Response, next: NextFunction): Promise<any> => {
  const { title, price, about, cloth, category, bought_by, saree_type, email } = req.body;
  const file = req.file;

  if (!file || !title || !price || !about || !cloth || !category || !bought_by || !saree_type) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const imagePath = file.path;

  try {
    await addProduct(imagePath, title, parseFloat(price), about, cloth, category, bought_by, saree_type, email);
    res.status(201).json({ message: "Product added successfully" });
  } catch (error) {
    next(error);
  }
};

export const fetchProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let user: any = null;
    if (req.params?.email != "null") {
      user = await getUserByEmail(req.params?.email);
    }

    const products: any = await getAllProductsWithFlags(user || null);


    const modifiedProducts = products.map((product: any) => ({
      ...product,
      image: `${req.protocol}://${req.get("host")}/${product.image?.replace(/\\/g, "/")}`,
    }));

    res.status(200).json(modifiedProducts);
  } catch (error) {
    next(error);
  }
};




// Like a product
export const likeProductService = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, productId } = req.body;

  try {
    const userId: any = await getUserIdByEmail(email); // ✅ Add await

    if (!userId || isNaN(userId)) {
      return res.status(404).json({ message: "User not found" });
    }

    const { message } = await likeProduct(userId, productId);
    res.status(200).json({ message: message });

  } catch (err) {
    res.status(500).json({ message: "Internal server error" }); // send JSON error
  }
};


// Get liked products
export const getLikedProducts = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const email: any = req.params.userId;
  try {
    const userId: any = await getUserIdByEmail(email); // ✅ Add await
    const products = await getLikedProductsByUser(userId);
    
    const modifiedProducts = products.map((product: any) => {
      return {
        ...product,
        image: `${req.protocol}://${req.get("host")}/${product.image.replace(/\\/g, "/")}`

      };
    });

    res.status(200).json(modifiedProducts);
  } catch (err) {
    next(err);
  }
};

// Add to cart
export const addToCartService = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, productId, quantity } = req.body;
  try {
    const userId: any = await getUserIdByEmail(email); // ✅ Add 'await'

    const { message } = await addToCart(userId, productId, quantity || 1);
    res.status(200).json({ message: message });
  } catch (err) {
    next(err);
  }
};

// Get cart
export const getCart = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const email: any = req.params.userId;
  try {
    const userId: any =await getUserIdByEmail(email);
    const cart = await getCartByUser(userId);
    const modifiedProducts = cart.map((product: any) => {
      return {
        ...product,
        image: `${req.protocol}://${req.get("host")}/${product.image.replace(/\\/g, "/")}`

      };
    });
    res.status(200).json(modifiedProducts);
  } catch (err) {
    next(err);
  }
};




export const sendQuery = async (request: Request, response: Response): Promise<any> => {
  try {

    // Check if environment variables are properly set
    if (!process.env.BE_EMAIL || !process.env.BE_PASSWORD) {
      return response.status(500).json({ error: "Email credentials missing. Please check server logs." });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.BE_EMAIL,
        pass: process.env.BE_PASSWORD, // Ensure this is correct
      },
    });

    let mailOptions;

    if (request?.body?.mobileNumber) {
      // Sending a query email
      mailOptions = {
        from: process.env.BE_EMAIL,
        to: process.env.BE_EMAIL, // Receiving email
        subject: "Demo Request for Product",
        html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <h2 style="color:#a4204d;">You have a new demo request for Product</h2>
              
                  <p style="font-size: 16px; color: #555;"><strong>Name :</strong> ${request?.body?.name}</p>
                  <p style="font-size: 16px; color: #555;"><strong>Email ID :</strong> ${request.body?.email}</p>
                  <p style="font-size: 16px; color: #555;"><strong>Mobile Number :</strong> ${request?.body?.mobileNumber}</p>
                  <p style="font-size: 16px; color: #555;"><strong>Request For :</strong> ${request?.body?.requestFor}</p>
                  <p style="font-size: 16px; color: #555;"><strong>Time and Date :</strong> ${request?.body?.date}</p>
              
                  <hr style="border: 1px solid #ddd; margin: 20px 0;"/>
              
              
                </div>
              `

      };
    } else if (request?.body?.review) {
      // Sending a query email
      mailOptions = {
        from: process.env.BE_EMAIL,
        to: process.env.BE_EMAIL, // Receiving email
        subject: "Review Product",
        html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color:#a4204d;">You have a new review about Product</h2>
            
                <p style="font-size: 16px; color: #555;"><strong>Name :</strong> ${request?.body?.name}</p>
                <p style="font-size: 16px; color: #555;"><strong>Email ID :</strong> ${request.body?.email}</p>
                <p style="font-size: 16px; color: #555;"><strong>Mobile Number :</strong> ${request?.body?.mobileNumber}</p>
                <p style="font-size: 16px; color: #555;"><strong>Review :</strong> ${request?.body?.review}</p>
                <p style="font-size: 16px; color: #555;"><strong>Stars :</strong> ${request?.body?.stars}</p>
            
                <hr style="border: 1px solid #ddd; margin: 20px 0;"/>
            
            
              </div>
            `

      };
    } else {
      mailOptions = {
        from: process.env.BE_EMAIL,
        to: process.env.BE_EMAIL, // Receiving email
        subject: "User Subscribtion",
        text: `You have a new user:
                    EmailId: ${request?.body?.email}`
      };
    }

    await transporter.sendMail(mailOptions);

    return response.status(200).json({ message: "Email sent successfully!" });

  } catch (error: any) {

    if (!response.headersSent) {
      return response.status(500).json({ error: "Failed to send email. Check server logs for details." });
    }
  }
};

export const addOrder = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const userId: any = await getUserIdByEmail(req.body.email);
    await createOrder(userId, req.body.id, req.body.quantity, req?.body?.price);
    res.status(200).json({ message: 'Order added successfully' });
  } catch (err) {
    next(err);
  };
}

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {


    const response: any = await updateProductStatus(parseInt(req.params.id), false);
    res.status(200).json({ data: response });
  } catch (err) {
    next(err);
  };
}

export const updateProduct = async (req: any, res: Response, next: NextFunction): Promise<any> => {
  const { id, title, price, about, cloth, category, bought_by, saree_type, email } = req.body;
  const file = req.file;

  if (!file || !title || !price || !about || !cloth || !category || !bought_by || !saree_type) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const imagePath = file.path;

  try {

    await editProduct(id, imagePath, title, parseFloat(price), about, cloth, category, bought_by, saree_type, email);
    res.status(201).json({ message: "Product added successfully" });
  } catch (error) {
    next(error);
  }
};

export const getFilteredProduct = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const keyword: string = req.query.keyword?.toString() || "";

    const productData = await getFilteredProductFromDB(page, keyword);
    
    res.status(200).json({ data: productData });
  } catch (err) {
    if (err instanceof Error) {
    
      res.status(500).json({ error: err.message });
    } else {
      // Fallback for unknown types
      res.status(500).json({ error: "An unknown error occurred." });
    }
  }
};


export const fetchProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const product = await getProductById(id);

    if (!product) {
      throw new Error(`Product with ID ${id} not found or inactive.`);
    }

    product.image = `${req.protocol}://${req.get("host")}/${product.image?.replace(/\\/g, "/")}`;

    res.status(200).json(product);
  } catch (error) {
    console.error("fetchProductById error:", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Internal Server Error" });
  }
};

export const getAllCategories = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const categories = await getUniqueProductCategoriesFromDB();
    res.status(200).json({ data: categories });
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred." });
    }
  }
};



export const getAllCategoriesProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const category: string = (req.body.category as string)?.trim() || "";

    if (!category) {
      res.status(400).json({ message: "Category is required" });
      return;
    }

    const products = await getProductsByCategoryFromDB(category);

    res.status(200).json({ data: products });
  } catch (error) {
    console.error("Error fetching category products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
