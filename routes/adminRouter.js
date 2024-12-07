const express = require('express')
const router = express.Router()
const adminController=require('../controllers/admin/adminController')
const customerController=require('../controllers/admin/customerController')
const categoryController=require('../controllers/admin/categoryController')
const productController=require('../controllers/admin/productController')
const {userAuth,adminAuth}=require('../middlewares/auth')


router.get('/pageerror',adminController.pageerror)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/dashboard',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)
router.get('/users',adminAuth,customerController.customers)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)
router.get('/category',adminAuth,categoryController.category)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.get('/listCategory',adminAuth,categoryController.listCategory)
router.get('/unlistCategory',adminAuth,categoryController.unlistCategory)
router.get('/editCategory',adminAuth,categoryController.getEditCategory)
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)
router.get('/addProducts',adminAuth,productController.getProductAddPage)
router.post('/addProducts',adminAuth,uploads.array('images',4).productController.addProducts)


module.exports=router