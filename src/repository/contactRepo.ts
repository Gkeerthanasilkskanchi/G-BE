
import { google } from 'googleapis';
import dotenv from "dotenv";

dotenv.config(); 

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export const getSheetsClient = () => {
  return google.sheets({ version: 'v4', auth });
};

export const sheets =getSheetsClient();
export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID



export const createUser = async (email: string, hashedPassword: string, role: string, userName: string) => {
  try {
    // Get existing IDs from Column A
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'users!A2:A', // IDs only
    });

    const existingIds = (existing.data.values || []).map(row => parseInt(row[0], 10));
    const nextId = (Math.max(...existingIds.filter(n => !isNaN(n))) || 0) + 1;

    // Append full row with ID
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'users!A:E', // ID, Email, Password, Role, UserName
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[nextId, email, hashedPassword, role, userName]],
      },
    });

  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
    throw error;
  }
};

export const getUserList = async (): Promise<any[]> => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'users!A2:E', // Includes ID to UserName
  });

  const rows = res.data.values || [];
  return rows.map(([id, email, password, role, userName]) => ({
    id: parseInt(id, 10), // Convert string ID to number
    email,
    password,
    role,
    userName,
  }));
};

export const getUserByEmail = async (email: string): Promise<any | null> => {
  const users = await getUserList();
  const user = users.find(u => u.email === email);
  return user || null;
};


export const addProduct = async (
  image: string,
  title: string,
  price: number,
  about: string,
  cloth: string,
  category: string,
  bought_by: string,
  saree_type: string,
  created_by: string
): Promise<void> => {
  const sheets = getSheetsClient();

  const created_at = new Date().toISOString();
  const is_active = 1;

  // 1. Get existing IDs
  const idRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:A', // Skip header, only fetch ID column
  });

  const existingIds = idRes.data.values?.flat().map(Number) || [];
  const maxId = existingIds.length > 0 ? Math.max(...existingIds.filter(id => !isNaN(id))) : 0;
  const newId = maxId + 1;

  // 2. Prepare row with ID
  const values = [
    [
      newId,
      image,
      title,
      price,
      about,
      cloth,
      category,
      bought_by,
      saree_type,
      created_at,
      created_by,
      is_active,
    ],
  ];

  // 3. Append to full range including column A
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A:L',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
};

export const likeProduct = async (userId: number, productId: number): Promise<{ message: string }> => {
  const sheetsClient = getSheetsClient();

  // Fetch all likes including ID
  const res = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'liked_products!A2:C', // includes ID, userId, productId
  });

  const likes = res.data.values || [];

  const index = likes.findIndex(([, uId, pId]) => parseInt(uId) === userId && parseInt(pId) === productId);

  if (index === -1) {
    // Auto-generate new ID
    const existingIds = likes.map(row => parseInt(row[0])).filter(id => !isNaN(id));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const newId = maxId + 1;

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'liked_products!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[newId, userId, productId]] },
    });
    return { message: 'Product Liked Successfully' };
  } else {
    const rowIndex = index + 2; // account for header row
    await sheetsClient.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `liked_products!A${rowIndex}:C${rowIndex}`,
    });
    return { message: 'Product Unliked Successfully' };
  }
};

export const updateProductStatus = async (productId: number, isActive: boolean): Promise<void> => {
  const sheetsClient = getSheetsClient();

  // Fetch full data including ID
  const res = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:L',
  });

  const products = res.data.values || [];

  // Find row by matching ID in column A
  const rowIndex = products.findIndex(([id]) => parseInt(id) === productId);

  if (rowIndex >= 0) {
    const updatedRow = products[rowIndex];
    updatedRow[11] = isActive ? '1' : '0';

    // Update row from column A:M (1:13)
    const range = `products!A${rowIndex + 2}:M${rowIndex + 2}`;
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updatedRow] },
    });
  }
};

export const getLikedProductsByUser = async (userId: number): Promise<any[]> => {
  const sheetsClient = getSheetsClient();

  // Fetch all products
  const productRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:M', // includes id to modifiedAt
  });
  const products = productRes.data.values || [];

  // Fetch liked products
  const likesRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'liked_products!A2:C',
  });

  const liked = (likesRes.data.values || []).filter(([, uId]) => parseInt(uId.trim()) === userId);
  const likedProductIds = new Set(liked.map(([_, __, productId]) => parseInt(productId)));

  // Fetch cart products
  const cartRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'cart_products!A2:D',
  });
  const cart = (cartRes.data.values || []).filter(([, uId]) => parseInt(uId.trim()) === userId);
  const cartProductIds = new Set(cart.map(([_, __, productId]) => parseInt(productId)));

  return products.map((row) => {
    const [
      productIdStr, image, title, price, about, cloth, category,
      bought_by, saree_type, created_at, created_by, is_active
    ] = row;

    const productId = parseInt(productIdStr);

    if (parseInt(is_active) !== 1 || !likedProductIds.has(productId)) return null;

    return {
      id: productId,
      image,
      title,
      price,
      about,
      cloth,
      category,
      bought_by,
      saree_type,
      created_at,
      created_by,
      is_product_liked: true,
      is_product_in_cart: cartProductIds.has(productId),
    };
  }).filter(Boolean);
};

export const addToCart = async (
  userId: number,
  productId: number,
  quantity: number
): Promise<{ message: string }> => {
  const sheetsClient = getSheetsClient();

  const res = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'cart_products!A2:D', // Include ID
  });

  const cartItems = res.data.values || [];

  const index = cartItems.findIndex(([, uid, pid]) =>
    parseInt(uid) === userId && parseInt(pid) === productId
  );

  if (index === -1) {
    // Auto-generate ID
    const existingIds = cartItems.map(([id]) => parseInt(id)).filter(id => !isNaN(id));
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    // Append new cart entry
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'cart_products!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[newId, userId, productId, quantity]],
      },
    });
    return { message: 'Product Added Successfully' };
  } else {
    const rowToDelete = index + 2; // account for header
    await sheetsClient.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `cart_products!A${rowToDelete}:D${rowToDelete}`,
    });
    return { message: 'Product removed Successfully' };
  }
};

export const getCartByUser = async (userId: number): Promise<any[]> => {
  const sheetsClient = getSheetsClient();

  // Products
  const productRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:L',
  });
  const products = productRes.data.values || [];

  // Cart Items
  const cartRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'cart_products!A2:D',
  });
  const cart = (cartRes.data.values || []).filter(([_, uid]) => parseInt(uid) === userId);
  const cartMap = new Map(cart.map(([_, __, pid, qty]) => [parseInt(pid), parseInt(qty)]));

  // Liked Items
  const likedRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'liked_products!A2:C',
  });
  const liked = (likedRes.data.values || []).filter(([_, uid]) => parseInt(uid) === userId);
  const likedSet = new Set(liked.map(([_, __, pid]) => parseInt(pid)));

  return products.map((row) => {
    const [
      id, image, title, price, about, cloth, category,
      bought_by, saree_type, created_at, created_by, is_active
    ] = row;

    const productId = parseInt(id);
    if (parseInt(is_active) !== 1 || !cartMap.has(productId)) return null;

    return {
      id: productId,
      image,
      title,
      price: parseFloat(price),
      about,
      cloth,
      category,
      bought_by,
      saree_type,
      created_at,
      created_by,
      is_product_in_cart: true,
      is_product_liked: likedSet.has(productId),
      quantity: cartMap.get(productId),
    };
  }).filter(Boolean);
};


export const getUserIdByEmail = async (email: string): Promise<number | null> => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'users!A2:E',
  });

  const users = res.data.values || [];

  for (const row of users) {
    const [id, userEmail] = row;

    if (
      userEmail &&
      userEmail.trim().toLowerCase() === email.trim().toLowerCase()
    ) {
      return parseInt(id);
    }
  }

  return null;
};


export const createOrder = async (
  userId: number,
  productId: number,
  quantity: number,
  price: number
): Promise<void> => {
  const sheetsClient = getSheetsClient();

  const res = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'orders!A2:A',
  });
  const existingIds = (res.data.values || []).map(([id]) => parseInt(id)).filter(id => !isNaN(id));
  const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'orders!A:E',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[newId, userId, productId, quantity, price]],
    },
  });
};


export const editProduct = async (
  id: number,
  image: string,
  title: string,
  price: number,
  about: string,
  cloth: string,
  category: string,
  bought_by: string,
  saree_type: string,
  modified_by: string
): Promise<void> => {
  const modified_at = new Date().toISOString();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:L', // Includes ID column (A) to modified_at (M)
  });

  const rows = res.data.values || [];
  
  const rowIndex = rows.findIndex(row => row[0] === id); 

  if (rowIndex !== -1) {
    const existing = rows[rowIndex];
    const updatedRow = [
      id.toString(), 
      image, title, price.toString(), about, cloth, category,
      bought_by, saree_type,
      existing[9] || '',        // created_at
      existing[10] || '',       // created_by
      existing[11] || '1',      // is_active
    ];

    const range = `products!A${rowIndex + 2}:L${rowIndex + 2}`; // +2 to offset header
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updatedRow] },
    });
  }
};


export const getFilteredProductFromDB = async (
  page: number,
  keyword: string = '',
  pageSize: number = 10
): Promise<{ products: any[]; total: number }> => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:M',
  });

  const allRows = res.data.values || [];

  const headers = [
    'id', 'image', 'title', 'price', 'about', 'cloth',
    'category', 'bought_by', 'saree_type',
    'created_at', 'created_by', 'is_active'
  ];

  const products = allRows
    .map((row) => {
      const data: any = Object.fromEntries(
        headers.map((key, idx) => [key, row[idx] || ''])
      );
      return data;
    })
    .filter(p => p.is_active === '1');

  const filtered = keyword.trim()
    ? products.filter(p =>
        [p.title, p.category, p.saree_type].some(field =>
          field?.toLowerCase().includes(keyword.toLowerCase())
        )
      )
    : products;

  const offset = (page - 1) * pageSize;
  const paginated = filtered.slice(offset, offset + pageSize);

  return {
    products: paginated,
    total: filtered.length,
  };
};



export const getProductById = async (id: number): Promise<any | null> => {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:M',
  });

  const rows = res.data.values || [];

  const headers = [
    'id', 'image', 'title', 'price', 'about', 'cloth',
    'category', 'bought_by', 'saree_type',
    'created_at', 'created_by', 'is_active'
  ];

  const row = rows.find(row => parseInt(row[0]) === id);

  if (!row || row[11] !== '1') return null;

  const product: any = Object.fromEntries(
    headers.map((key, idx) => [key, row[idx] || ''])
  );

  return product;
};

export const getAllProductsWithFlags = async (user: { id: number }) => {
  // Products
  const productRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:L',
  });

  const products = (productRes.data.values || []).map((row) => ({
    id: row[0],
    image: row[1],
    title: row[2],
    price: row[3],
    about: row[4],
    cloth: row[5],
    category: row[6],
    bought_by: row[7],
    saree_type: row[8],
    created_at: row[9],
    created_by: row[10],
    is_active: row[11],
  })).filter(p => p.is_active === '1');

  // Liked products
  const likedRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'liked_products!A2:C',
  });

  const likedIds = new Set(
    (likedRes.data.values || [])
      .filter(row => parseInt(row[0]) === user.id)
      .map(row => row[1].trim())
  );

  // Cart products
  const cartRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'cart_products!A2:D',
  });

  const cartIds = new Set(
    (cartRes.data.values || [])
      .filter(row => parseInt(row[0]) === user.id)
      .map(row => row[1].trim())
  );

  return products.map(product => ({
    ...product,
    is_product_liked: likedIds.has(product.image?.trim()),
    is_product_in_cart: cartIds.has(product.image?.trim()),
  }));
};

