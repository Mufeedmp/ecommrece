const User = require('../../models/userSchema');
const bcrypt = require('bcrypt');



const loadForgetPassword=async (req,res) => {
    try {
        res.render('forget-password')
    } catch (error) {
        
    }
   }

   const forgetPassword=async (req,res) => {
    const{email}=req.body
    try {
        const user=await User.findOne({email})
        if (!user) {
            return res.render('forget-password', { errorMessage: 'Email not found!' });
          }
          const otp = generateOtp();
          const emailSent = await sendVerificationEmail(email, otp);
  
          if (!emailSent) {
              return res.render('login', { message: 'Failed to send OTP. Please try again.' });
          }
  
          req.session.userOtp = otp;
          req.session.userEmail = email;
  
          res.render('forget-passwordOTP');
          console.log('OTP sent:', otp);
    } catch (error) {
        console.error(' error:', error);
        res.redirect('/pageNotFound');
    }
   }
   const forgetPasswordOtp=async (req,res) => {
    try {
        const { otp } = req.body;

        console.log('Received OTP:', otp);
        console.log('Stored OTP:', req.session.userOtp);
        
        if (otp === req.session.userOtp) {
           
            res.status(200).json({
                success: true,
                redirectUrl: '/reset-password',  
            });
        } else {
            
            res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.',
            });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
    }
   }

   const loadResetPassword=async (req,res) => {
    try {
        res.render('reset-password')
    } catch (error) {
        
    }
   }

   const resetPassword = async (req, res) => {
       const { newPass, confirmPass} = req.body;
       try {
           if (!newPass || !confirmPass) {
               return res.status(400).json({
                   success: false,
                   message: "Both newPass and confirmPass are required",
               });
           }
           if (newPass !== confirmPass) {
               return res.status(400).render('reset-password', {
                   message: 'New passwords do not match.',
               });
           }
           const hashedPassword = await bcrypt.hash(newPass,10);
           const user = await User.findOne({ email: req.session.userEmail });
           if (!user) {
               return res.status(400).json({
                   success: false,
                   message: "User not found with the provided email",
               });
           }
           user.password = hashedPassword;
           await user.save();
   
           req.session.userOtp = null;
           req.session.userEmail = null;
        
           res.redirect('/login');
   
       } catch (error) {
        console.error(error);
        if (!res.headersSent) {
            res.status(500).send('Internal server error');
        }
       }
   };

   module.exports = {
    loadForgetPassword,
    forgetPassword,
    forgetPasswordOtp,
    loadResetPassword,
    resetPassword,
   
};