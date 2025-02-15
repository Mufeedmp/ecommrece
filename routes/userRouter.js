const express = require('express')
const router = express.Router()
const passport = require('passport')
const orderController=require('../controllers/user/orderController')
const errorHomeController=require('../controllers/user/errorHomeController')
const authenticationController=require('../controllers/user/authenticationController')
const userProfileController=require('../controllers/user/userProfileController')
const passwordRecoveryController=require('../controllers/user/passwordRecoveryController')
const addressController=require('../controllers/user/addressController')
const shopProductController=require('../controllers/user/shopProductController')
const { userAuth } = require('../middlewares/auth')


 
// User Authentication & Profile Routes
router.get('/signup', authenticationController.loadSignup);
router.post('/signup', authenticationController.signup);
router.get('/loadverify-otp',authenticationController.loadVerifyOtp)
router.post('/verify-otp', authenticationController.verifyotp);
router.post('/resend-otp', authenticationController.resendotp);

router.get('/login', authenticationController.loadLogin);
router.post('/login', authenticationController.login);
router.get('/logout', authenticationController.logout);

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',passport.authenticate('google', { failureRedirect: '/signup' }),(req, res) => {res.redirect('/');});


// Error & Home Routes
router.get('/pageNotFound',errorHomeController.pageNotFound);
router.get('/',userAuth, errorHomeController.loadHomepage);

// User Profile Management
router.get('/profile',userAuth, userProfileController.loadProfile);
router.get('/edit-profile',userAuth, userProfileController.loadEditProfile);
router.post('/edit-profile', userProfileController.editProfile);
router.get('/change-password',userAuth, userProfileController.loadChangePassword);
router.post('/change-password', userProfileController.changePassword);
router.get('/wallet',userAuth, userProfileController.loadWallet);

// Address Management
router.get('/address',userAuth, addressController.loadAddress);
router.get('/add-address',userAuth, addressController.loadAddAddress);
router.post('/add-address', addressController.addAddress);
router.get('/edit-address/:id',userAuth, addressController.loadEditAddress);
router.post('/edit-address', addressController.editAddress);
router.post('/deleteAddress/:id', addressController.deleteAddress);

// Password Recovery
router.get('/forget-password',userAuth, passwordRecoveryController.loadForgetPassword);
router.post('/forget-password', passwordRecoveryController.forgetPassword);
router.post('/forget-passwordOTP', passwordRecoveryController.forgetPasswordOtp);
router.get('/reset-password',userAuth, passwordRecoveryController.loadResetPassword);
router.post('/reset-password', passwordRecoveryController.resetPassword);

// Shop and Product Routes
router.get('/shop',userAuth, shopProductController.loadShopPage);
router.get('/productDetails/:id',userAuth, shopProductController.productDetails);

// Cart Routes
router.post('/addToCart', orderController.addToCart);
router.get('/cart',userAuth, orderController.loadCart);
router.put('/updateCart', orderController.updateCart);
router.delete('/removeItem', orderController.removeItem);

// Checkout Routes
router.get('/checkout',userAuth, orderController.loadCheckout);
router.post('/checkout', orderController.placeOrder);
router.post('/applyCoupon',orderController.applyCoupon)
router.post('/create-order',orderController.createOrder)
router.post('/verify-payment',orderController.verifyPayment)
router.post('/pay-wallet',orderController.payUsingWallet);
router.post('/retry-Payment/:paymentOrderId',orderController.retryPayment)
router.post('/retryVerify-payment',orderController.retryVerifyPayment)

// Wishlist Routes
router.get('/wishlist',userAuth, shopProductController.loadWishlist);
router.post('/addToWishlist', shopProductController.addToWishlist);
router.post('/removeFromWishlist', shopProductController.removeFromWishlist);

// Order Management
router.get('/orderSuccess',userAuth, orderController.orderSuccess);
router.get('/orders',userAuth, orderController.loadOrders);
router.get('/orderDetails/:id',userAuth, orderController.orderDetails);
router.post('/cancelOrder/:orderId', orderController.cancelOrder);
router.patch('/cancelItem/:orderId/:productId', orderController.cancelItem);
router.post('/returnOrder', orderController.returnOrder);
router.get('/download-invoice/:orderId',userAuth,orderController.downloadInvoice)


module.exports = router;

