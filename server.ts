import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { connectMongoDB, isMongoConnected } from './src/server/db/mongodb.ts';
import { apiRouter } from './src/server/routes/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : 3000;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ----------------------------------------------------
// CORS
// ----------------------------------------------------
const ALLOWED_ORIGINS = new Set([
  'https://keerthivasanclg-design.github.io',
  'http://localhost:5173',
  'http://localhost:5174',
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Vary', 'Origin');

  res.header(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  );

  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// ----------------------------------------------------
// BODY PARSING
// ----------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------
// API ROUTES
// Final API URL:
// https://office-management-api-qyed.onrender.com/api/...
// ----------------------------------------------------
app.use('/api', apiRouter);

// ----------------------------------------------------
// SERVER STARTUP
// ----------------------------------------------------
async function startServer() {
  const mongoConnected = await connectMongoDB();

  console.log(
    `MongoDB status: ${
      mongoConnected && isMongoConnected()
        ? 'CONNECTED'
        : 'NOT CONNECTED'
    }`
  );

  // --------------------------------------------------
  // PRODUCTION
  // --------------------------------------------------
  if (IS_PRODUCTION) {
    if (!mongoConnected || !isMongoConnected()) {
      throw new Error(
        'MongoDB connection is required in production. Check MONGODB_URI and MongoDB Atlas Network Access.'
      );
    }

    const distPath = path.resolve(__dirname, 'dist');

    app.use(express.static(distPath));

    // SPA fallback
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // --------------------------------------------------
  // DEVELOPMENT
  // --------------------------------------------------
  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  }

  // --------------------------------------------------
  // START LISTENING
  // --------------------------------------------------
  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Office Management System server running on http://0.0.0.0:${PORT}`
    );

    if (IS_PRODUCTION) {
      console.log('Environment: PRODUCTION');
      console.log('MongoDB: CONNECTED');
    } else {
      console.log('Environment: DEVELOPMENT');
    }
  });
}

// ----------------------------------------------------
// STARTUP ERROR HANDLING
// ----------------------------------------------------
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});