import { Router } from 'express';
import * as notificationsController from './notifications.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();

router.use(authenticate);

router.get('/', notificationsController.getNotifications);
router.patch('/read-all', notificationsController.markAllAsRead);
router.patch('/:id/read', notificationsController.markAsRead);

export default router;
