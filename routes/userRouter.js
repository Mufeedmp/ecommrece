const express = require('express')
const router = express.Router()
const userController = require('../controllers/user/userController')
const passport = require('passport')
const productController=require('../controllers/user/productController')
const {userAuth}=require('../middlewares/auth')



router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomepage)
router.get('/shop',userController.loadShopPage)
router.get('/signup',userController.loadSignup)
router.post('/signup',userController.signup) 
router.post('/verify-otp',userController.verifyotp)
router.post('/resend-otp',userController.resendotp)

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
}) 

router.get('/login',userController.loadLogin)
router.post('/login',userController.login)
router.get('/logout',userAuth,userController.logout)

router.get('/productDetails/:id',productController.productDetails)
router.get('/profile',userController.loadProfile)
router.get('/change-email',userController.loadChangeEmail)
router.post('/change-email',userController.verifyEmailOtp)
router.post('/verify-email-otp',userController.loadUpdateEmail)
router.post('/update-email',userController.emailChanged)
router.get('/change-password',userController.loadChangePassword)
router.post('/change-password',userAuth,userController.changePassword)
router.get('/address',userController.loadAddress)
router.get('/add-address',userController.loadAddAddress)
router.post('/add-address',userAuth,userController.addAddress)
router.get('/edit-address/:id',userController.loadEditAddress)
router.post('/edit-address',userController.editAddress)     
router.post('/deleteAddress/:id',userController.deleteAddress) 
 
module.exports = router;    