import { Router } from 'express';
import * as paymentsController from './payments.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/stats', paymentsController.getPaymentStats);
router.route('/').get(paymentsController.getPayments).post(paymentsController.recordPayment);

export default router;
