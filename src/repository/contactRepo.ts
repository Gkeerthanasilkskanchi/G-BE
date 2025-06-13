
import { log } from 'console';
import { google } from 'googleapis';
import path from 'path';

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../credentials/service-account.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export const getSheetsClient = () => {
  return google.sheets({ version: 'v4', auth });
};

export const sheets =getSheetsClient();
export const SPREADSHEET_ID = '1Hp8V7vr_Z0eXC3GqVShzBV7526S_iPvbxdF5MWLU2Vs';



export const createUser = async (email: string, hashedPassword: string, role: string, userName: string) => {

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'users!A:D', // Corresponds to Email, Password, Role, UserName
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[email, hashedPassword, role, userName]],
      },
    });

    console.log('User added to Google Sheets:', response.statusText);
  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
    throw error;
  }
};

export const getUserList = async (): Promise<any[]> => {

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'users!A2:D', // Skip header row
  });

  const rows = res.data.values || [];
  return rows.map(([email, password, role, userName]) => ({
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
  const sheets =  getSheetsClient();

  const created_at = new Date().toISOString();
  const is_active = 1;

  const values = [
    [
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

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A:K',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
};

export const getAllProducts = async (): Promise<any[]> => {

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:K', // Skip header row
  });

  const rows = res.data.values || [];

  return rows.map(row => {
    const [
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
    ] = row;

    return {
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
      is_active: parseInt(is_active),
    };
  });
};

export const likeProduct = async (userId: number, productId: number): Promise<{ message: string }> => {

  // Fetch all likes
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'liked_products!A2:B', // skip header
  });

  const likes = res.data.values || [];
  const index = likes.findIndex(([uId, pId]) => parseInt(uId) === userId && parseInt(pId) === productId);

  if (index === -1) {
    // Add new like
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'liked_products!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[userId, productId]] },
    });
    return { message: 'Product Liked Successfully' };
  } else {
    // Unlike: Clear the row
    const rowIndex = index + 2; // account for header
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `liked_products!A${rowIndex}:B${rowIndex}`,
    });
    return { message: 'Product Unliked Successfully' };
  }
};
export const updateProductStatus = async (productId: number, isActive: boolean): Promise<void> => {

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:N',
  });

  const products = res.data.values || [];
  const rowIndex = products.findIndex((_, idx) => idx === productId - 1); // Assuming ID == row number

  if (rowIndex >= 0) {
    const updatedRow = products[rowIndex];
    updatedRow[10] = isActive ? '1' : '0'; // isActive at column K (11th col)
    updatedRow[11] = 'admin';              // ModifiedBy
    updatedRow[12] = new Date().toISOString(); // ModifiedAt

    const range = `products!A${rowIndex + 2}:N${rowIndex + 2}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [updatedRow] },
    });
  }
};
export const getLikedProductsByUser = async (userId: number): Promise<any[]> => {
  const productRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:N',
  });
  const products = productRes.data.values || [];

  const likesRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'liked_products!A2:B',
  });
  const liked = (likesRes.data.values || []).filter(([uId]) => parseInt(uId.trim()) === userId);
  const likedProductIds = new Set(liked.map(([_, imagePath]) => imagePath.trim()));

  const cartRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'cart_products!A2:B',
  });
  const cart = (cartRes.data.values || []).filter(([uId]) => parseInt(uId.trim()) === userId);
  const cartProductIds = new Set(cart.map(([_, imagePath]) => imagePath.trim()));

  // 💡 Use image as identifier instead of productId
  return products.map((row) => {
    const [
      productId, image, title, price, about, cloth, category,
      bought_by, saree_type, created_at, created_by, is_active,
    ] = row;

    const trimmedImage = image.trim();

    if (parseInt(is_active) !== 1 || !likedProductIds.has(trimmedImage)) return null;

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
      is_product_in_cart: cartProductIds.has(trimmedImage),
    };
  }).filter(Boolean);
};


export const addToCart = async (
  userId: number,
  productId: number,
  quantity: number
): Promise<{ message: string }> => {
  const sheets = getSheetsClient()

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'cart_products!A2:C',
  });

  const cartItems = res.data.values || [];
  const index = cartItems.findIndex(([uid, pid]) =>
    parseInt(uid) === userId && parseInt(pid) === productId
  );

  if (index === -1) {
    // Add to cart
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'cart_products!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[userId, productId, quantity]],
      },
    });
    return { message: 'Product Added Successfully' };
  } else {
    // Remove from cart
    const rowToDelete = index + 2;
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sheet3!A${rowToDelete}:C${rowToDelete}`,
    });
    return { message: 'Product removed Successfully' };
  }
};
export const getCartByUser = async (userId: number): Promise<any[]> => {

  // Products
  const productRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:N',
  });
  const products = productRes.data.values || [];

  // Cart Items
  const cartRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'cart_products!A2:C',
  });
  const cart = (cartRes.data.values || []).filter(([uid]) => parseInt(uid) === userId);
  const cartMap = new Map(cart.map(([_, pid, qty]) => [parseInt(pid), parseInt(qty)]));

  // Liked Items
  const likedRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'liked_products!A2:B',
  });
  const liked = (likedRes.data.values || []).filter(([uid]) => parseInt(uid) === userId);
  const likedSet = new Set(liked.map(([_, pid]) => parseInt(pid)));

  return products.map((row, index) => {
    const productId = index + 1;
    const [
      image, title, price, about, cloth, category,
      bought_by, saree_type, created_at, created_by, is_active,
    ] = row;

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
  console.log("Fetched Users:", users);

  for (let i = 0; i < users.length; i++) {
    const row = users[i];
    const userEmail = row[0]; // ✅ Now correct: email is in column A

    console.log(`Row ${i + 2}: Email = '${userEmail}'`);

    if (
      userEmail &&
      userEmail.trim().toLowerCase() === email.trim().toLowerCase()
    ) {
      const fakeUserId = i + 2; // row number to act as user ID
      console.log("✅ Match Found! Returning user ID:", fakeUserId);
      return fakeUserId;
    }
  }

  console.log("❌ No matching email found for:", email);
  return null;
};


export const createOrder = async (
  userId: number,
  productId: number,
  quantity: number,
  price: number
): Promise<void> => {

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'orders!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[userId, productId, quantity, price]],
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
    range: 'products!A2:N',
  });

  const rows = res.data.values || [];

  const rowIndex = id - 1; // row 2 is index 0

  if (rows[rowIndex]) {
    const existing = rows[rowIndex];
    const updatedRow = [
      image, title, price.toString(), about, cloth, category, bought_by,
      saree_type, existing[8], existing[9], existing[10] || '1',
      modified_by, modified_at,
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `products!A${rowIndex + 2}:N${rowIndex + 2}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [updatedRow],
      },
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
    range: 'products!A2:Z', // Reads all data rows from row 2 onward
  });

  const allRows = res.data.values || [];

  // Match the columns in the sheet (excluding ID column)
  const headers = [
    'image',
    'title',
    'price',
    'about',
    'cloth',
    'category',
    'bought_by',
    'saree_type',
    'created_at',
    'created_by',
    'is_active'
  ];

  const products = allRows
    .map((row, i) => {
      const data: any = Object.fromEntries(
        headers.map((key, idx) => [key, row[idx] || ''])
      );

      // 👇 Make 'id' the first key
      return {
        id: i + 1,
        ...data,
      };
    })
    .filter((p) => p.is_active === '1');

  // Filter based on keyword
  const filtered = keyword.trim()
    ? products.filter((p) =>
        [p.title, p.category, p.saree_type].some((field) =>
          field?.toLowerCase().includes(keyword.toLowerCase())
        )
      )
    : products;

  // Pagination logic
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
    range: 'products!A2:Z',
  });

  const rows = res.data.values || [];

  const headers = [
    'image',
    'title',
    'price',
    'about',
    'cloth',
    'category',
    'bought_by',
    'saree_type',
    'created_at',
    'created_by',
    'is_active'
  ];

  // index = id - 1 since id is manually generated
  const index = id - 1;
  const row = rows[index];

  if (!row || row[10] !== '1') {
    return null;
  }

  const product: any = Object.fromEntries(
    headers.map((key, idx) => [key, row[idx] || ''])
  );

  return {
    id,
    ...product,
  };
};



export const getAllProductsWithFlags = async (user: { id: number }) => {

  // Products
  const productRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'products!A2:Z',
  });

  const products = (productRes.data.values || []).map((row, i) => ({
    id: row[0],
    title: row[1],
    price: row[2],
    category: row[5],
    saree_type: row[7],
    is_active: row[10],
    // Add all fields needed
  })).filter(p => p.is_active === '1');

  // Liked products
  const likedRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'liked_products!A2:B',
  });

  const likedIds = new Set(
    (likedRes.data.values || [])
      .filter(row => parseInt(row[0]) === user.id)
      .map(row => row[1])
  );

  // Cart products
  const cartRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'cart_products!A2:B',
  });

  const cartIds = new Set(
    (cartRes.data.values || [])
      .filter(row => parseInt(row[0]) === user.id)
      .map(row => row[1])
  );

  return products.map(product => ({
    ...product,
    is_product_liked: likedIds.has(product.id),
    is_product_in_cart: cartIds.has(product.id),
  }));
};
