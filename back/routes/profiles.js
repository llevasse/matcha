const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken } = require('../middleware/auth');
const { updateProfileValidity } = require('../services/usersService');
const asyncHandler = require('../middleware/asyncHandler');
const {
    getUserPictures,
    uploadPicture,
    setMainPicture,
    deletePicture
} = require('../services/profileService');

const router = express.Router();

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/profiles');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
        } catch (error) {
            console.error('Error creating upload directory:', error);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'), false);
        }
    }
});

router.get('/', authenticateToken, asyncHandler(async (req, res) => {
    const pictures = await getUserPictures(req.user.id);
    res.json(pictures);
}));

router.get('/:user_id', authenticateToken, asyncHandler(async (req, res) => {
    const pictures = await getUserPictures(req.params.user_id);
    res.json(pictures);
}));

router.post('/upload', authenticateToken, upload.single('photo'), asyncHandler(async (req, res) => {
    const picture = await uploadPicture(req.user.id, req.file);
    await updateProfileValidity(req.user.id);

    res.status(201).json({
        ...picture,
        message: 'Photo uploaded successfully'
    });
}));

router.put('/:id/main', authenticateToken, asyncHandler(async (req, res) => {
    await setMainPicture(req.user.id, req.params.id);
    res.json({ message: 'Main picture updated successfully' });
}));

router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
    await deletePicture(req.user.id, req.params.id);
    res.json({ message: 'Picture deleted successfully' });
}));

module.exports = router;