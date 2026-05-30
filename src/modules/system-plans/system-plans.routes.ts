import { Router } from 'express';
import { SystemPlansController } from './system-plans.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createSystemPlanSchema, updateSystemPlanSchema } from './system-plans.validation';

const router = Router();
const controller = new SystemPlansController();

// All routes require authentication
router.use(authenticate);

// List plans (accessible by GYM_OWNER as well if needed in future, but primarily for Admin)
router.get('/', controller.getSystemPlans);

// Management routes (SUPER_ADMIN only)
router.post(
  '/',
  authorize('SUPER_ADMIN'),
  validate(createSystemPlanSchema),
  controller.createSystemPlan
);

router.put(
  '/:id',
  authorize('SUPER_ADMIN'),
  validate(updateSystemPlanSchema),
  controller.updateSystemPlan
);

router.delete(
  '/:id',
  authorize('SUPER_ADMIN'),
  controller.deleteSystemPlan
);

export default router;
