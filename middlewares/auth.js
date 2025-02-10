const { session } = require('passport')
const User=require('../models/userSchema')
const { Admin } = require('mongodb');

// Global middleware to populate req.user
const userAuth=(async (req, res, next) => {
    if (req.session.user) {
        try {
            const user = await User.findById(req.session.user);
            if (user && !user.isBlocked) {
                req.user = user;
            } else {
                // If user is blocked, destroy session
                 req.session.destroy(err => {
                    if (err) {
                        console.error('Error destroying session:', err);
                        return next(err);
                    }
                    // Redirect with a query parameter to show a message
                    return res.redirect('/login?message=blocked');
                });
                return;
            }
        } catch (error) {
            console.error('Error fetching user in global middleware:', error);
            return next(error);
        }
    }
    next();
});


const adminAuth=(req,res,next)=>{
        User.findOne({isAdmin:true})
        .then(data=>{
            if(data){
                next()
            }else{
                res.redirect('/admin/login')
            }
        })
        .catch(error=>{
            console.log('error in admin auth middle ware')
            res.status(500).send('internal server error')
        })

    }

       

    


    module.exports={
        userAuth,
        adminAuth,
    }