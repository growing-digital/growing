import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import {
  connectMongoDB,
  isMongoConnected,
} from './src/server/db/mongodb.ts';

import { apiRouter } from './src/server/routes/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : 3000;

const IS_PRODUCTION =
  process.env.NODE_ENV === 'production';

// ----------------------------------------------------
// CORS
// ----------------------------------------------------
//
// IMPORTANT:
// GitHub Pages website:
// https://growing-digital.github.io/growing/
//
// CORS origin must be:
// https://growing-digital.github.io
//
// Do NOT add /growing/ to the origin.
// ----------------------------------------------------

const ALLOWED_ORIGINS = new Set([
  // NEW GitHub Pages username
  'https://growing-digital.github.io',

  // OLD GitHub Pages username
  // Keep this temporarily so the old frontend can still
  // communicate with the backend during the transition.
  'https://keerthivasanclg-design.github.io',

  // Local development
  'http://localhost:5173',
  'http://localhost:5174',
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow requests that do not send an Origin header.
  //
  // Example:
  // - server-to-server requests
  // - some development tools
  if (!origin) {
    res.header(
      'Access-Control-Allow-Credentials',
      'true'
    );

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

    return next();
  }

  // --------------------------------------------------
  // Allowed browser origins
  // --------------------------------------------------

  if (ALLOWED_ORIGINS.has(origin)) {
    res.header(
      'Access-Control-Allow-Origin',
      origin
    );

    res.header(
      'Access-Control-Allow-Credentials',
      'true'
    );
  }

  // --------------------------------------------------
  // Always vary by Origin
  // --------------------------------------------------

  res.header(
    'Vary',
    'Origin'
  );

  // --------------------------------------------------
  // Allowed HTTP methods
  // --------------------------------------------------

  res.header(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  );

  // --------------------------------------------------
  // Allowed request headers
  // --------------------------------------------------

  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  // --------------------------------------------------
  // Preflight request
  // --------------------------------------------------

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// ----------------------------------------------------
// BODY PARSING
// ----------------------------------------------------

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ----------------------------------------------------
// API ROUTES
//
// Final API URL:
//
// https://office-management-api-qyed.onrender.com/api/...
// ----------------------------------------------------

app.use(
  '/api',
  apiRouter
);

// ----------------------------------------------------
// SERVER STARTUP
// ----------------------------------------------------

async function startServer() {
  // --------------------------------------------------
  // CONNECT TO MONGODB
  // --------------------------------------------------

  const mongoConnected =
    await connectMongoDB();

  console.log(
    `MongoDB status: ${
      mongoConnected &&
      isMongoConnected()
        ? 'CONNECTED'
        : 'NOT CONNECTED'
    }`
  );

  // --------------------------------------------------
  // PRODUCTION
  // --------------------------------------------------

  if (IS_PRODUCTION) {
    // MongoDB is required in production.
    //
    // This prevents the production application from
    // silently switching to local/in-memory storage.
    if (
      !mongoConnected ||
      !isMongoConnected()
    ) {
      throw new Error(
        'MongoDB connection is required in production. Check MONGODB_URI and MongoDB Atlas Network Access.'
      );
    }

    // ------------------------------------------------
    // SERVE FRONTEND BUILD
    // ------------------------------------------------

    const distPath =
      path.resolve(
        __dirname,
        'dist'
      );

    app.use(
      express.static(distPath)
    );

    // ------------------------------------------------
    // SPA FALLBACK
    // ------------------------------------------------

    app.use(
      (_req: Request, res: Response) => {
        res.sendFile(
          path.join(
            distPath,
            'index.html'
          )
        );
      }
    );
  }

  // --------------------------------------------------
  // DEVELOPMENT
  // --------------------------------------------------

  if (!IS_PRODUCTION) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
        },
        appType: 'spa',
      });

    app.use(
      vite.middlewares
    );
  }

  // --------------------------------------------------
  // START LISTENING
  // --------------------------------------------------

  app.listen(
    PORT,
    '0.0.0.0',
    () => {
      console.log(
        `Office Management System server running on http://0.0.0.0:${PORT}`
      );

      if (IS_PRODUCTION) {
        console.log(
          'Environment: PRODUCTION'
        );

        console.log(
          'MongoDB: CONNECTED'
        );

        console.log(
          'Allowed GitHub Pages origin: https://growing-digital.github.io'
        );
      } else {
        console.log(
          'Environment: DEVELOPMENT'
        );
      }
    }
  );
}

// ----------------------------------------------------
// STARTUP ERROR HANDLING
// ----------------------------------------------------

startServer().catch(
  (error) => {
    console.error(
      'Failed to start server:',
      error
    );

    process.exit(1);
  }
);