import { Router } from 'express';
import * as gymsController from './gyms.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { createGymSchema, updateGymSchema } from './gyms.validation';

const router = Router();

router.use(authenticate);

router.route('/')
  .get(gymsController.getGyms)
  .post(validate(createGymSchema), gymsController.createGym);

import { authorize } from '../../middleware/authorize';

router.route('/:id')
  .get(gymsController.getGym)
  .patch(validate(updateGymSchema), gymsController.updateGym)
  .delete(gymsController.deleteGym);

router.patch('/:id/status', authorize('SUPER_ADMIN'), gymsController.toggleStatus);

router.get('/:id/dashboard', gymsController.getDashboard);

export default router;
