const express = require('express')
const router = express.Router()
const passport = require('passport')
const {userAuth}=require('../middlewares/auth')
const orderController=require('../controllers/user/orderController')
const errorHomeController=require('../controllers/user/errorHomeController')
const authenticationController=require('../controllers/user/authenticationController')
const userProfileController=require('../controllers/user/userProfileController')
const passwordRecoveryController=require('../controllers/user/passwordRecoveryController')
const addressController=require('../controllers/user/addressController')
const shopProductController=require('../controllers/user/shopProductController')



// Error & Home Routes
router.get('/pageNotFound',errorHomeController.pageNotFound);
router.get('/', errorHomeController.loadHomepage);

// User Authentication & Profile Routes
router.get('/signup', authenticationController.loadSignup);
router.post('/signup', authenticationController.signup);
router.post('/verify-otp', authenticationController.verifyotp);
router.post('/resend-otp', authenticationController.resendotp);

router.get('/login', authenticationController.loadLogin);
router.post('/login', authenticationController.login);
router.get('/logout', userAuth, authenticationController.logout);

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/signup' }),(req, res) => {res.redirect('/');});

// User Profile Management
router.get('/profile', userProfileController.loadProfile);
router.get('/change-password', userProfileController.loadChangePassword);
router.post('/change-password', userAuth, userProfileController.changePassword);
router.get('/wallet', userProfileController.loadWallet);

// Address Management
router.get('/address', addressController.loadAddress);
router.get('/add-address', addressController.loadAddAddress);
router.post('/add-address', userAuth, addressController.addAddress);
router.get('/edit-address/:id', addressController.loadEditAddress);
router.post('/edit-address', addressController.editAddress);
router.post('/deleteAddress/:id', addressController.deleteAddress);

// Password Recovery
router.get('/forget-password', passwordRecoveryController.loadForgetPassword);
router.post('/forget-password', passwordRecoveryController.forgetPassword);
router.post('/forget-passwordOTP', passwordRecoveryController.forgetPasswordOtp);
router.get('/reset-password', passwordRecoveryController.loadResetPassword);
router.post('/reset-password', passwordRecoveryController.resetPassword);

// Shop and Product Routes
router.get('/shop', shopProductController.loadShopPage);
router.get('/productDetails/:id', shopProductController.productDetails);

// Cart Routes
router.post('/addToCart', shopProductController.addToCart);
router.get('/cart', shopProductController.loadCart);
router.put('/updateCart', shopProductController.updateCart);
router.delete('/removeItem', shopProductController.removeItem);

// Checkout Routes
router.get('/checkout', shopProductController.loadCheckout);
router.post('/checkout', shopProductController.placeOrder);
router.post('/applyCoupon',shopProductController.applyCoupon)
router.post('/create-order',shopProductController.createOrder)
router.post('/verify-payment',shopProductController.verifyPayment)

// Wishlist Routes
router.get('/wishlist', shopProductController.loadWishlist);
router.post('/addToWishlist', shopProductController.addToWishlist);
router.post('/removeFromWishlist', shopProductController.removeFromWishlist);

// Order Management
router.get('/orderSuccess', orderController.orderSuccess);
router.get('/orders', orderController.loadOrders);
router.get('/orderDetails/:id', orderController.orderDetails);
router.post('/cancelOrder/:id', orderController.cancelOrder);
router.post('/returnOrder', orderController.returnOrder);

module.exports = router;




// router.get('/pageNotFound',userController.pageNotFound)
// router.get('/',userController.loadHomepage)
// router.get('/shop',userController.loadShopPage)
// router.get('/signup',userController.loadSignup)
// router.post('/signup',userController.signup) 
// router.post('/verify-otp',userController.verifyotp)
// router.post('/resend-otp',userController.resendotp)

// router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
// router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
//     res.redirect('/')
// }) 

// router.get('/login',userController.loadLogin)
// router.post('/login',userController.login)
// router.get('/logout',userAuth,userController.logout)

// router.get('/productDetails/:id',productController.productDetails)
// router.get('/profile',userController.loadProfile)
// router.get('/change-email',userController.loadChangeEmail)
// router.post('/change-email',userController.verifyEmailOtp)
// router.post('/verify-email-otp',userController.loadUpdateEmail)
// router.post('/update-email',userController.emailChanged)
// router.get('/change-password',userController.loadChangePassword)
// router.post('/change-password',userAuth,userController.changePassword)
// router.get('/address',userController.loadAddress)
// router.get('/add-address',userController.loadAddAddress)
// router.post('/add-address',userAuth,userController.addAddress)
// router.get('/edit-address/:id',userController.loadEditAddress)
// router.post('/edit-address',userController.editAddress)     
// router.post('/deleteAddress/:id',userController.deleteAddress) 
// router.get('/forget-password',userController.loadForgetPassword)
// router.post('/forget-password',userController.forgetPassword)
// router.post('/forget-passwordOTP',userController.forgetPasswordOtp)
// router.get('/reset-password',userController.loadResetPassword)
// router.post('/reset-password',userController.resetPassword)
// router.post('/addToCart',productController.addToCart)
// router.get('/cart',productController.loadCart)
// router.put('/updateCart',productController.updateCart)
// router.get('/checkout',productController.loadCheckout)
// router.delete('/removeItem',productController.removeItem)
// router.post('/checkout',productController.placeOrder)
// router.get('/orderSuccess',productController.orderSuccess)
// router.get('/orders',productController.loadOrders)
// router.get('/orderDetails/:id',productController.orderDetails)
// router.post('/cancelOrder/:id',productController.cancelOrder)
// router.get('/wishlist',productController.loadWishlist)
// router.post('/addToWishlist',productController.addToWishlist)
// router.post('/removeFromWishlist',productController.removeFromWishlist)
// router.get('/wallet',userController.loadWallet)
// router.post('/returnOrder/:id',orderController.returnOrder)

 
// module.exports = router;    