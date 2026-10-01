// import mongoose from 'mongoose';

// let isConnected = false;

// export async function connectMongoDB(): Promise<boolean> {
//   if (isConnected) {
//     return true;
//   }

//   const uri = process.env.MONGODB_URI?.trim();
//   if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
//     console.info('[MongoDB] No valid MONGODB_URI provided (must start with mongodb:// or mongodb+srv://). Operating in local JSON storage mode.');
//     return false;
//   }

//   try {
//     const conn = await mongoose.connect(uri, {
//       serverSelectionTimeoutMS: 5000,
//       socketTimeoutMS: 45000,
//     });

//     isConnected = conn.connections[0].readyState === 1;
//     console.log(`[MongoDB] Connected successfully to database: ${conn.connection.name}`);
//     return true;
//   } catch (error: any) {
//     console.warn(`[MongoDB] Connection error (${error.message}). Continuing with local database.`);
//     return false;
//   }
// }

// export function isMongoConnected(): boolean {
//   return isConnected && mongoose.connection.readyState === 1;
// }

// export const mongoState = {
//   get isConnected() {
//     return isConnected && mongoose.connection.readyState === 1;
//   },
// };

// mongoose.connection.on('disconnected', () => {
//   isConnected = false;
//   console.warn('[MongoDB] Connection lost.');
// });


import mongoose from 'mongoose';

// ============================================================
// CONNECTION STATE
// ============================================================

let isConnected = false;
let isConnecting = false;

// ============================================================
// CONNECT TO MONGODB
// ============================================================

export async function connectMongoDB(): Promise<boolean> {
  // Already connected
  if (
    isConnected &&
    mongoose.connection.readyState === 1
  ) {
    return true;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    return false;
  }

  const uri =
    process.env.MONGODB_URI?.trim();

  // ----------------------------------------------------------
  // Validate URI
  // ----------------------------------------------------------

  if (
    !uri ||
    (
      !uri.startsWith('mongodb://') &&
      !uri.startsWith('mongodb+srv://')
    )
  ) {
    isConnected = false;

    console.warn(
      '[MongoDB] MONGODB_URI is missing or invalid.'
    );

    return false;
  }

  isConnecting = true;

  try {
    // --------------------------------------------------------
    // Connect
    // --------------------------------------------------------

    const connection =
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 1,
      });

    isConnected =
      connection.connections[0]?.readyState === 1;

    if (isConnected) {
      console.log(
        `[MongoDB] Connected successfully to database: ${connection.connection.name}`
      );
    }

    return isConnected;
  } catch (error: unknown) {
    isConnected = false;

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      `[MongoDB] Connection failed: ${message}`
    );

    return false;
  } finally {
    isConnecting = false;
  }
}

// ============================================================
// CONNECTION STATUS
// ============================================================

export function isMongoConnected(): boolean {
  return (
    isConnected &&
    mongoose.connection.readyState === 1
  );
}

// ============================================================
// MONGODB STATE
// ============================================================

export const mongoState = {
  get isConnected() {
    return isMongoConnected();
  },
};

// ============================================================
// CONNECTION EVENTS
// ============================================================

mongoose.connection.on(
  'connected',
  () => {
    isConnected = true;

    console.log(
      '[MongoDB] Connection established.'
    );
  }
);

mongoose.connection.on(
  'disconnected',
  () => {
    isConnected = false;

    console.warn(
      '[MongoDB] Connection lost.'
    );
  }
);

mongoose.connection.on(
  'reconnected',
  () => {
    isConnected = true;

    console.log(
      '[MongoDB] Connection restored.'
    );
  }
);

mongoose.connection.on(
  'error',
  (error) => {
    console.error(
      '[MongoDB] Connection error:',
      error
    );
  }
);