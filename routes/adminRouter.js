const express = require('express')
const router = express.Router()
const adminController=require('../controllers/admin/adminController')
const customerController=require('../controllers/admin/customerController')
const categoryController=require('../controllers/admin/categoryController')
const productController=require('../controllers/admin/productController')
const orderController=require('../controllers/admin/orderController')
const couponController=require('../controllers/admin/couponController')
const dashboardController=require('../controllers/admin/dashboardController')
const {adminAuth}=require('../middlewares/auth')
const {uploadCategoryImage,uploadProductImage}=require('../utils/multer')
const path = require('path')
const fs = require('fs')




router.get('/pageerror', adminController.pageerror) 

router.get('/dashboard', dashboardController.getDashboardData)
router.get('/dashboard-sales', dashboardController.getSalesByFilter);

router.get('/login', adminController.loadLogin)
router.post('/login', adminController.login)

router.get('/logout', adminController.logout)

router.get('/users', adminAuth, customerController.customers)
router.get('/blockCustomer', adminAuth, customerController.customerBlocked)
router.get('/unblockCustomer', adminAuth, customerController.customerunBlocked)

router.get('/category', adminAuth, categoryController.category)
router.post('/addCategory', adminAuth, uploadCategoryImage.single('images'), categoryController.addCategory)
router.get('/listCategory', adminAuth, categoryController.listCategory)
router.get('/unlistCategory', adminAuth, categoryController.unlistCategory)
router.get('/editCategory', adminAuth, categoryController.getEditCategory)
router.post('/editCategory/:id', adminAuth, uploadCategoryImage.single('images'), categoryController.editCategory)
router.delete('/deleteImage/:categoryId/:name', adminAuth, categoryController.deleteCategoryImage)

router.get('/addProducts', adminAuth, productController.getProductAddPage)
router.post('/addProducts', adminAuth, uploadProductImage.array('images', 4), productController.addProducts)
router.get('/products', adminAuth, productController.getAllProducts)
router.get('/blockProduct', adminAuth, productController.blockProduct)
router.get('/unblockProduct', adminAuth, productController.unblockProduct)
router.get('/editProduct', adminAuth, productController.getEditProduct)
router.post('/editProduct/:id', adminAuth, uploadProductImage.array('images', 4), productController.editProduct)
router.delete('/deleteImage/:productId/:imageName', adminAuth, productController.deleteSingleImage)

router.get('/orderList', adminAuth,orderController.orderList)
router.get('/order-details/:id', adminAuth, orderController.orderDetails)
router.post('/update-status', adminAuth, orderController.updateOrderStatus)
router.get('/salesReport',adminAuth,orderController.loadReport)
router.get('/download-excel',adminAuth,orderController.loadExcel)
router.get('/download-pdf',adminAuth,orderController.loadPdf);


router.get('/coupons', adminAuth, couponController.loadCoupon)
router.get('/addCoupon', adminAuth, couponController.loadAddCoupon)
router.post('/createCoupon', adminAuth, couponController.createCoupon)
router.post('/deleteCoupon',adminAuth,couponController.deleteCoupon)



module.exports=router
