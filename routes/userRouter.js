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
router.post('/addToCart', orderController.addToCart);
router.get('/cart', orderController.loadCart);
router.put('/updateCart', orderController.updateCart);
router.delete('/removeItem', orderController.removeItem);

// Checkout Routes
router.get('/checkout', orderController.loadCheckout);
router.post('/checkout', orderController.placeOrder);
router.post('/applyCoupon',orderController.applyCoupon)
router.post('/create-order',orderController.createOrder)
router.post('/verify-payment',orderController.verifyPayment)
router.post('/pay-wallet',orderController.payUsingWallet);
router.post('/retry-Payment/:paymentOrderId',orderController.retryPayment)
router.post('/retryVerify-payment',orderController.retryVerifyPayment)

// Wishlist Routes
router.get('/wishlist', shopProductController.loadWishlist);
router.post('/addToWishlist', shopProductController.addToWishlist);
router.post('/removeFromWishlist', shopProductController.removeFromWishlist);

// Order Management
router.get('/orderSuccess', orderController.orderSuccess);
router.get('/orders', orderController.loadOrders);
router.get('/orderDetails/:id', orderController.orderDetails);
router.post('/cancelOrder/:orderId', orderController.cancelOrder);
router.patch('/cancelItem/:orderId/:productId', orderController.cancelItem);
router.post('/returnOrder', orderController.returnOrder);
router.get('/download-invoice/:orderId',orderController.downloadInvoice)


module.exports = router;

