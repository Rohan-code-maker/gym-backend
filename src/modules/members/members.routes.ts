import { Router } from 'express';
import * as membersController from './members.controller';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { createMemberSchema, updateMemberSchema, deleteMembersSchema } from './members.validation';
import { upload } from '../../config/cloudinary';

const router = Router({ mergeParams: true });

router.use(authenticate);

// Middleware to map Cloudinary URL to body.avatar
const handleAvatar = (req: any, res: any, next: any) => {
  if (req.file && req.file.path) {
    req.body.avatar = req.file.path;
  }
  next();
};

router.route('/')
  .get(membersController.getMembers)
  .post(upload.single('avatar'), handleAvatar, validate(createMemberSchema), membersController.createMember)
  .delete(validate(deleteMembersSchema), membersController.deleteMembers);

router.route('/:id')
  .get(membersController.getMember)
  .patch(upload.single('avatar'), handleAvatar, validate(updateMemberSchema), membersController.updateMember)
  .delete(membersController.deleteMember);

export default router;
