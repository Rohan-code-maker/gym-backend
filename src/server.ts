import app from './app';
import { config } from './config';
import prisma from './config/database';
import { initFirebase } from './config/firebase';
import { startMembershipExpiryJob } from './jobs/membershipExpiry';

const startServer = async () => {
  try {
    // Connect to database
    await prisma.$connect();

    // Initialize Firebase
    initFirebase();

    // Start HTTP server
    const server = app.listen(config.port, '0.0.0.0', () => {
    });

    // Start cron jobs
    startMembershipExpiryJob();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

startServer();
