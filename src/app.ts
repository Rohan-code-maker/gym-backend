import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { config } from './config';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { AppError } from './shared/utils/AppError';

import authRoutes from './modules/auth/auth.routes';
import gymsRoutes from './modules/gyms/gyms.routes';
import membersRoutes from './modules/members/members.routes';
import plansRoutes from './modules/plans/plans.routes';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import systemPlansRoutes from './modules/system-plans/system-plans.routes';

const app = express();

// Trust proxy for rate limiting behind Render's load balancers
app.set('trust proxy', 1);

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ─── Request parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// ─── Logging ──────────────────────────────────────────────────────────────────
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'GymPro Manager API is running', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/gyms`, gymsRoutes);
app.use(`${API_PREFIX}/gyms/:gymId/members`, membersRoutes);
app.use(`${API_PREFIX}/gyms/:gymId/plans`, plansRoutes);
app.use(`${API_PREFIX}/gyms/:gymId/subscriptions`, subscriptionsRoutes);
app.use(`${API_PREFIX}/gyms/:gymId/payments`, paymentsRoutes);
app.use(`${API_PREFIX}/notifications`, notificationsRoutes);
app.use(`${API_PREFIX}/system-plans`, systemPlansRoutes);

// ─── Deep Link Redirector ───────────────────────────────────────────────────────
app.get('/reset-password', (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).send('Invalid or missing token.');
  } else {

  // This serves a small HTML page that automatically redirects the device to the custom scheme
  // This bypasses Gmail's restriction on clicking custom scheme links directly.
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Opening GymPro...</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; }
        .btn { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;}
      </style>
    </head>
    <body>
      <h2>Opening GymPro...</h2>
      <p>If the app doesn't open automatically, click the button below:</p>
      <a href="gympro://reset-password?token=${token}" class="btn">Open GymPro App</a>
      <script>
        // Attempt automatic redirect
        window.location.href = "gympro://reset-password?token=${token}";
      </script>
    </body>
    </html>
  `;
  res.send(html);
  }
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.all('*', (req, _res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
