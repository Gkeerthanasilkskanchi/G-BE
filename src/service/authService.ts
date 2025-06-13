import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail, getUserList } from "../repository/contactRepo";


export const registerUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, password ,userName} = req.body;

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    console.log("test",existingUser)
    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser(email, hashedPassword,'admin',userName);
 
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    next(error); 
  }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { email, password } = req.body;

  try {
    const user :any= await getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" ,data:user});
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({ message: "Login successful",role:user.role });
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {

  try {
    const existingUser = await getUserList();
    
    res.status(201).json({ data:existingUser});
  } catch (error) {
    next(error);
  }
};