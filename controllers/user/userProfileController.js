const User = require('../../models/userSchema');
const Wallet=require('../../models/walletSchema')
const bcrypt = require('bcrypt');



const loadProfile=async (req,res) => {
    try {
        if(req.session.passport){
            req.session.user=req.session.passport.user
        }
        if( req.session.user){
            const userData=await User.findOne({_id:req.session.user}) 
            res.render('profile',{user:userData})
        }else{
            res.redirect('/')
        }
    } catch (error) {
        console.log('error',error);
        res.redirect('/pageNotFound')
        
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
   const loadWallet=async (req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        if (!userId) {
            return res.redirect('/login');
        }

        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.render('wallet', {
              user: userData,
              wallet: { balance: 0, transactions: [] },
            });
          }
          res.render('wallet', { user: userData, wallet });
    } catch (error) {
        
    }
}

   module.exports = {
    loadProfile,
    loadChangePassword,
    changePassword,
    loadWallet
   }