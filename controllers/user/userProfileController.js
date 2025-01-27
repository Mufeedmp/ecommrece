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

   const loadWallet = async (req, res, next) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        const userData = await User.findById(userId);
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.render('wallet', {
                user: userData,
                wallet: { balance: 0, transactions: [] },
                totalPages: 1,
                currentPage: 1
            });
        }

        const count = wallet.transactions.length;
        const totalPages = Math.ceil(count / limit);

        const paginatedTransactions = wallet.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(skip, skip + limit);

        const paginatedWallet = {
            ...wallet.toObject(),
            transactions: paginatedTransactions
        };

        res.render('wallet', {
            user: userData,
            wallet: paginatedWallet,
            totalPages: totalPages,
            currentPage: page
        });

    } catch (error) {
        next(error);
    }
};

   module.exports = {
    loadProfile,
    loadChangePassword,
    changePassword,
    loadWallet
   }