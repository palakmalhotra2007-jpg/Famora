import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

import authRoutes from './routes/auth.routes';
import homeRoutes from './routes/home.routes';
import newspaperRoutes from './routes/newspaper.routes';
import postsRoutes from './routes/posts.routes';
import challengesRoutes from './routes/challenges.routes';
import memoriesRoutes from './routes/memories.routes';
import eventsRoutes from './routes/events.routes';
import gamesRoutes from './routes/games.routes';
import bucketListRoutes from './routes/bucketList.routes';
import timeCapsuleRoutes from './routes/timeCapsule.routes';
import achievementsRoutes from './routes/achievements.routes';
import assistantRoutes from './routes/assistant.routes';
import notificationsRoutes from './routes/notifications.routes';
import uploadRoutes from './routes/upload.routes';
import locationRoutes from './routes/location.routes';
import mailboxRoutes from './routes/mailbox.routes';
import wallRoutes from './routes/wall.routes';
import podcastRoutes from './routes/podcast.routes';
import path from 'path';
import { setSocketServer } from './socket';

const app = express();
const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
});

setSocketServer(io);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.isDev ? 1000 : 100,
  message: { success: false, error: 'Too many requests' },
});
app.use(limiter);

const apiPrefix = `/api/${config.apiVersion}`;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: config.apiVersion, timestamp: new Date().toISOString() });
});

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/home`, homeRoutes);
app.use(`${apiPrefix}/newspapers`, newspaperRoutes);
app.use(`${apiPrefix}/posts`, postsRoutes);
app.use(`${apiPrefix}/challenges`, challengesRoutes);
app.use(`${apiPrefix}/memories`, memoriesRoutes);
app.use(`${apiPrefix}/events`, eventsRoutes);
app.use(`${apiPrefix}/games`, gamesRoutes);
app.use(`${apiPrefix}/bucket-list`, bucketListRoutes);
app.use(`${apiPrefix}/time-capsules`, timeCapsuleRoutes);
app.use(`${apiPrefix}/achievements`, achievementsRoutes);
app.use(`${apiPrefix}/assistant`, assistantRoutes);
app.use(`${apiPrefix}/notifications`, notificationsRoutes);
app.use(`${apiPrefix}/upload`, uploadRoutes);
app.use(`${apiPrefix}/locations`, locationRoutes);
app.use(`${apiPrefix}/mailbox`, mailboxRoutes);
app.use(`${apiPrefix}/wall`, wallRoutes);
app.use(`${apiPrefix}/podcast`, podcastRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use(notFoundHandler);
app.use(errorHandler);

io.on('connection', (socket) => {
  logger.debug('Client connected', { socketId: socket.id });

  socket.on('join-family', (familyId: string) => {
    socket.join(`family:${familyId}`);
    logger.debug('Joined family room', { familyId, socketId: socket.id });
  });

  socket.on('leave-family', (familyId: string) => {
    socket.leave(`family:${familyId}`);
  });

  socket.on('disconnect', () => {
    logger.debug('Client disconnected', { socketId: socket.id });
  });
});

export { app, httpServer, io };
