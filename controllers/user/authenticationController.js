const User = require('../../models/userSchema');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');





const loadSignup = async (req, res) => {
    try {
        res.render('signup');
    } catch (error) {
        console.error('Error loading signup page:', error);
        res.status(500).send('Server Error');
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

    module.exports = {
        loadSignup,
        signup,
        verifyotp,
        resendotp,
        loadLogin,
        login,
        logout,
    };
     