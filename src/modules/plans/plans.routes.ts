import { Router } from 'express';
import * as plansController from './plans.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { createPlanSchema, updatePlanSchema } from './plans.validation';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.route('/')
  .get(plansController.getPlans)
  .post(validate(createPlanSchema), plansController.createPlan);

router.route('/:id')
  .get(plansController.getPlan)
  .patch(validate(updatePlanSchema), plansController.updatePlan)
  .delete(plansController.deletePlan);

export default router;
