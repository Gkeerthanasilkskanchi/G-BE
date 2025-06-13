import bcrypt from "bcryptjs";

// Encrypt the password
export const encryptPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

// Compare the passwords
export const comparePassword = async (password: string, hashedPassword: string) => {
  return await bcrypt.compare(password, hashedPassword);
};
