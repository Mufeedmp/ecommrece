const express = require('express')
const router = express.Router()
const adminController=require('../controllers/admin/adminController')
const customerController=require('../controllers/admin/customerController')
const categoryController=require('../controllers/admin/categoryController')
const productController=require('../controllers/admin/productController')
const orderController=require('../controllers/admin/orderController')
const couponController=require('../controllers/admin/couponController')
const dashboardController=require('../controllers/admin/dashboardController')
const {uploadCategoryImage,uploadProductImage}=require('../utils/multer')
const path = require('path')
const fs = require('fs')
const { adminAuth } = require('../middlewares/auth')



router.get('/pageerror', adminController.pageerror) 

router.get('/dashboard', dashboardController.getDashboardData)
router.get('/dashboard-sales', dashboardController.getSalesByFilter);

router.get('/login', adminController.loadLogin)
router.post('/login', adminController.login)

router.get('/logout', adminController.logout)

router.get('/users', customerController.customers)
router.get('/blockCustomer', customerController.customerBlocked)
router.get('/unblockCustomer', customerController.customerunBlocked)

router.get('/category', categoryController.category)
router.post('/addCategory', uploadCategoryImage.single('images'), categoryController.addCategory)
router.get('/listCategory', categoryController.listCategory)
router.get('/unlistCategory', categoryController.unlistCategory)
router.get('/editCategory', categoryController.getEditCategory)
router.post('/editCategory/:id', uploadCategoryImage.single('images'), categoryController.editCategory)
router.delete('/deleteImage/:categoryId/:name', categoryController.deleteCategoryImage)

router.get('/addProducts', productController.getProductAddPage)
router.post('/addProducts', uploadProductImage.array('images', 4), productController.addProducts)
router.get('/products', productController.getAllProducts)
router.get('/blockProduct', productController.blockProduct)
router.get('/unblockProduct', productController.unblockProduct)
router.get('/editProduct', productController.getEditProduct)
router.post('/editProduct/:id', uploadProductImage.array('images', 4), productController.editProduct)
router.delete('/deleteImage/:productId/:imageName', productController.deleteSingleImage)

router.get('/orderList',orderController.orderList)
router.get('/order-details/:id', orderController.orderDetails)
router.post('/update-status', orderController.updateOrderStatus)
router.get('/salesReport',orderController.loadReport)
router.get('/download-excel',orderController.loadExcel)
router.get('/download-pdf',orderController.loadPdf);


router.get('/coupons', couponController.loadCoupon)
router.get('/addCoupon', couponController.loadAddCoupon)
router.post('/createCoupon', couponController.createCoupon)
router.post('/deleteCoupon',couponController.deleteCoupon)



module.exports=router
