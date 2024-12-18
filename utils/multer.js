const multer = require('multer');
const path = require('path');


const productStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join('.', 'public', 'uploads','product-images'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const categoryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join('.', 'public', 'uploads','cat-images'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});


const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); 
    } else {
        cb(new Error('Only image files are allowed'), false); 
    }
};


const uploadProductImage = multer({
    storage: productStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadCategoryImage = multer({
    storage: categoryStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports={
    uploadCategoryImage,
    uploadProductImage
}