import mongoose from 'mongoose';

let isConnected = false;

export async function connectMongoDB(): Promise<boolean> {
  if (isConnected) {
    return true;
  }

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
    console.info('[MongoDB] No valid MONGODB_URI provided (must start with mongodb:// or mongodb+srv://). Operating in local JSON storage mode.');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log(`[MongoDB] Connected successfully to database: ${conn.connection.name}`);
    return true;
  } catch (error: any) {
    console.warn(`[MongoDB] Connection error (${error.message}). Continuing with local database.`);
    return false;
  }
}

export function isMongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export const mongoState = {
  get isConnected() {
    return isConnected && mongoose.connection.readyState === 1;
  },
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[MongoDB] Connection lost.');
});
