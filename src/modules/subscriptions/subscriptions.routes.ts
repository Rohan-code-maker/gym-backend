import { Router } from 'express';
import * as subsController from './subscriptions.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { createSubscriptionSchema, updateSubscriptionSchema } from './subscriptions.validation';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/expiring', subsController.getExpiringSubscriptions);
router.get('/expired', subsController.getExpiredSubscriptions);

router.route('/')
  .get(subsController.getSubscriptions)
  .post(validate(createSubscriptionSchema), subsController.createSubscription);

router.route('/:id')
  .patch(validate(updateSubscriptionSchema), subsController.updateSubscription);

export default router;
