import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

export { cloudinary };

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'gym_members',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    // Optional: add basic transformations
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  } as any,
});

export const upload = multer({ storage });
