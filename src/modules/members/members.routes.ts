import { Router } from 'express';
import * as membersController from './members.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { createMemberSchema, updateMemberSchema, deleteMembersSchema } from './members.validation';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.route('/')
  .get(membersController.getMembers)
  .post(validate(createMemberSchema), membersController.createMember)
  .delete(validate(deleteMembersSchema), membersController.deleteMembers);

router.route('/:id')
  .get(membersController.getMember)
  .patch(validate(updateMemberSchema), membersController.updateMember)
  .delete(membersController.deleteMember);

export default router;
