const User = require('../../models/userSchema');
const Category=require('../../models/categorySchema')
const Product=require('../../models/productSchema')
const env = require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const Address = require('../../models/addressSchema');



const loadSignup = async (req, res) => {
    try {
        res.render('signup');
    } catch (error) {
        console.error('Error loading signup page:', error);
        res.status(500).send('Server Error');
    }
};


const loadHomepage = async (req, res) => {
    try {
        if(req.session.passport){
            req.session.user=req.session.passport.user
        }
        
        const categories=await Category.find({isListed:true})
    
       
        let productData=await Product.find({
            isBlocked:false,
            
        }).populate('category')
        

        productData.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
        productData=productData.slice(0,4)
 
     
 
        if(req.session.user){
           const userData=await User.findOne({_id:req.session.user}) 
           
          return res.render('home',{user:userData,Products:productData,categories});
        }else{
            return res.render('home',{Products:productData,categories})
        }
        
    } catch (error) {
        console.error('Error loading homepage:', error);
        res.status(500).send('Server Error');
    }
};


const loadShopPage=async (req,res) => {
    try {
        if(req.session.passport){
            req.session.user=req.session.passport.user
        }
        const query = req.query.query?.trim() || '';
        const sortOption =req.query.sort || '';
        const categories=await Category.find({isListed:true})
        
    
    let sortCriteria = {};
    switch (sortOption) {
      case 'popularity':
        sortCriteria = { popularity: -1 }; 
        break;
      case 'price-asc':
        sortCriteria = { salePrice: 1 }; 
        break;
      case 'price-desc':
        sortCriteria = { salePrice: -1 }; 
        break;
      case 'new-arrivals':
        sortCriteria = { createdAt: -1 }; 
        break;
      case 'a-z':
        sortCriteria = { productName: 1 }; 
        break;
      case 'z-a':
        sortCriteria = { productName: -1 }; 
        break;
      default:
        sortCriteria = { createdAt: -1 }; 
    }
       
     
        let productData=await Product.find({
            isBlocked:false,
            productName: { $regex: query, $options: 'i' },
        }).populate('category') .sort(sortCriteria)
        

 
        if(req.session.user){
           const userData=await User.findOne({_id:req.session.user}) 
           
          return res.render('shop',{user:userData,Products:productData,categories,});
        }else{
            return res.render('shop',{Products:productData,categories})
        }
        
    } catch (error) {
        console.error('Error loading homepage:', error);
        res.status(500).send('Server Error');
    }
}


const pageNotFound = async (req, res) => {
    try {
        res.render('page-404');
    } catch (error) {
       
        res.redirect('/PageNotFound');
    }
};


function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
                callbackURL:'http://localhost:3000/auth/google/callback'
            },
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Verify Your Account',
            html: `<b>Your OTP: ${otp}</b>`,
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

const securePassword = async (password) => {
    const saltRounds = 10;
    try {
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw error;
    }
}; 
 
const signup = async (req, res) => {
    try {
        const { name, phone, email, password, cPassword } = req.body;

        if (password !== cPassword) {
            return res.render('signup', { message: 'Passwords do not match.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('signup', { message: 'User already exists.' });
        }
 
        const otp = generateOtp();
        const emailSent = await sendVerificationEmail(email, otp);

        if (!emailSent) {
            return res.render('signup', { message: 'Failed to send OTP. Please try again.' });
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };

        res.render('verify-otp');
        console.log('OTP sent:', otp);
    } catch (error) {
        console.error('Signup error:', error);
        res.redirect('/pageNotFound');
    }
};  

const verifyotp = async (req, res) => {
    try {
        const { otp } = req.body;

        console.log('Received OTP:', otp);
        console.log('Stored OTP:', req.session.userOtp);

        if (otp === req.session.userOtp) {
            const user = req.session.userData;

            const passwordHash = await securePassword(user.password);

            const newUser = new User({
                name: user.name,
                email: user.email,
                phone: user.phone,
                password: passwordHash,
            });
 console.log('Generated OTP:', otp);
            console.log('Stored in session:', req.session.userOtp);
            await newUser.save();
           
            req.session.user = newUser._id;

            delete req.session.userOtp;
            delete req.session.userData;



            res.json({ success: true, redirectUrl: '/' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
    }
};

const resendotp=async (req,res) => {
    try {
        if (!req.session.userData) {
            return res.status(400).json({ success: false, message: 'User session not found. Please signup again.' });
        }

        const newOtp=generateOtp()
        const{email}=req.session.userData

        const emailSent=await sendVerificationEmail(email,newOtp)

        if (!emailSent) {
            return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
        }

      
        req.session.userOtp = newOtp;

        console.log('Resent OTP:', newOtp);
        res.json({ success: true, message: 'OTP resent successfully.' });
    } catch (error) {
        console.error('Error resending OTP:', error);
        res.status(500).json({ success: false, message: 'An error occurred while resending the OTP.' });
    }
    }

    const loadLogin= async (req,res) => {
        try {
            if(!req.session.user){
                return res.render('login')
            }else{
                res.redirect('/')
            }
        } catch (error) {
            res.redirect('/pageNotFound')
        }
    }

    const login=async (req,res) => {
        try {
            const {email,password}=req.body
            

            const findUser=await User.findOne({isAdmin:0,email:email})

            if(!findUser){
               return res.render('login',{message:'user not found'})
            }

            if(findUser.isBlocked){
                return res.render('login',{message:'user blocked by admin'})
             }

             const passwordMatch=await bcrypt.compare(password,findUser.password)
           
             if(!passwordMatch){
                return res.render('login',{message:'incorrect password'})
             }

             req.session.user=findUser.id
             console.log('User logged in:', req.session.user);
             res.redirect('/')
        } catch (error) {
            console.error('login error');
            res.render('login',{message:'login failed , please try again'})
        }
    }

    const logout=async (req,res) => {
        try {
            req.session.destroy((err)=>{
                if(err){
                    console.log('session destruction error',err.message);
                    return res.redirect('/pageNotFound')
                }else{
                    return res.redirect('/login') 
                }
            })
        } catch (error) {
            console.log('logout error',error);
            res.redirect('/pageNotFound')
            
        }
    }

   const loadProfile=async (req,res) => {
    try {
        if(req.session.passport){
            req.session.user=req.session.passport.user
        }
        if( req.session.user){
            const userData=await User.findOne({_id:req.session.user}) 
            res.render('profile',{user:userData})
        }else{
            res.redirect('/home')
        }
    } catch (error) {
        console.log('error',error);
        res.redirect('/pageNotFound')
        
    }
   }

   const loadChangeEmail=async (req,res) => {
    try {
        if(req.session.passport){
            req.session.user=req.session.passport.user
        }
        if(req.session.user){
            const userData=await User.findOne({_id:req.session.user}) 
            
            res.render('change-email',{userData})
        }else{
             res.redirect('/home')
        }
    } catch (error) {
        console.log('error',error);
        res.redirect('/pageNotFound')  
    }
   }

   const verifyEmailOtp=async (req,res) => {
    try {
        res.render('change-email-otp')
    } catch (error) {
        
    }
   }

   const loadUpdateEmail=async (req,res) => {
    try {
        res.render('new-email')
    } catch (error) {
        
    }
   }

   const emailChanged=async (req,res) => {
    try {
        res.redirect('/profile')
    } catch (error) {
        
    }
   }

   const loadChangePassword=async (req,res) => {
    try {
        res.render('change-password')
    } catch (error) {
        
    }
   }

   const changePassword=async (req,res) => {
    const { currentPass, newPass, confirmPass } = req.body;
    try {

        const user = req.user;

     const isMatch = await bcrypt.compare(currentPass,user.password)

     if (!isMatch) {
        return res.status(400).render('change-password', {
            message: 'Current password is incorrect.'
        });
    }
    if (newPass !== confirmPass) {
        return res.status(400).render('change-password', {
            message: 'New passwords do not match.'
        });
    }
    const hashedPassword = await bcrypt.hash(newPass, 10);
    user.password = hashedPassword;
    await user.save();
        res.redirect('/profile')
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
   }
   const loadAddress=async (req,res) => {
    try {
        
         const userId = req.session.user
         console.log("userId from session:", userId);
        if (!userId) {
            return res.redirect('/profile');  
          }
          const userData=await User.findOne({_id:req.session.user}) 
        const addresses = await Address.find({ userId }); 
        console.log('addresses:',addresses); 
      
        res.render('address', { addresses ,user:userData })
    } catch (error) {
        console.error('Error loading addresses:', error);
        res.redirect('/pageNotFound');
    }
   }

   const loadAddAddress = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login'); 
        }

        const userData = await User.findOne({ _id: req.session.user });

        res.render('add-address', { user: userData });
    } catch (error) {
        console.error('Error loading add address page:', error);
        res.status(500).send('Internal Server Error');
    }
};

   const addAddress = async (req, res) => {
    try {
      if (!req.user || !req.user._id) {
        throw new Error('User ID is missing');
      }
  
      const address = req.body;
      const userId = req.user._id;
  
      let addressDocument = await Address.findOne({ userId });
  
      if (addressDocument) {
        addressDocument.address.push({
          addressType: address.addressType,
          name: address.name,
          city: address.city,
          landmark: address.landmark,
          state: address.state,
          pincode: String(address.pincode),
          phone: address.phone,
          altphone: address.altphone
        });
        await addressDocument.save();
      } else {
        const newAddress = new Address({
          userId: userId,
          address: [
            {
              addressType: address.addressType,
              name: address.name,
              city: address.city,
              landmark: address.landmark,
              state: address.state,
              pincode: String(address.pincode),
              phone: address.phone,
              altphone: address.altphone
            }
          ]
        });
        await newAddress.save();
      }
  
      return res.redirect('/address');
    } catch (error) {
      console.error('Error creating address:', error);
      return res.redirect('/pageNotFound');
    }
  };
  
   const loadEditAddress=async (req,res) => {
    const addressId=req.params.id
    
    try {
        const userData=await User.findOne({_id:req.session.user})
        const parentDocument = await Address.findOne({
            "address._id": addressId 
        });
        const address = parentDocument.address.find(addr => addr._id.toString() === addressId);
        console.log('address',address);
        
        if (!address) {
            return res.status(404).send('Address not found.');
        }

        res.render('edit-address',{address,user:userData})
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
   }
   
   const editAddress=async (req,res) => {

    const addressId=req.query.id
    const updatedData=req.body


    try {
        const result=await Address.updateOne(
            {'address._id':addressId },
            {
                $set:{
                    'address.$.addressType':updatedData.addressType,
                    "address.$.name": updatedData.name,
                    "address.$.city": updatedData.city,
                    "address.$.landmark": updatedData.landmark,
                    "address.$.state": updatedData.state,
                    "address.$.pincode": updatedData.pincode,
                    "address.$.phone": updatedData.phone,
                    "address.$.altphone": updatedData.altphone,
                }
            }
        )

        console.log('Address updated successfully:', result);
        res.redirect('/address'); 
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
   }

   const deleteAddress=async (req,res) => {
    const addressId=req.params.id
    const userId = req.user.id;
    console.log('Address ID:', addressId); 
    console.log('User ID:', userId); 
    try {
        const result = await Address.updateOne(
            { userId: userId},{$pull:{address:{_id: addressId }}}
        );
        console.log('Address deleted successfully:', result);
        res.redirect('/address')
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).send('Internal Server Error');
    }
   }

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
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyotp,
    resendotp,
    loadLogin,
    login,
    logout,
    loadShopPage,
    loadProfile,
    loadChangeEmail,
    verifyEmailOtp,
    loadUpdateEmail,
    emailChanged,
    loadChangePassword,
    changePassword,
    loadAddress,
    loadAddAddress,
    loadEditAddress,
    addAddress,
    editAddress,
    deleteAddress,
    loadForgetPassword,
    forgetPassword,
    forgetPasswordOtp,
    loadResetPassword,
    resetPassword,
  
    
};
 