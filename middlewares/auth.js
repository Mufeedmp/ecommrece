const { session } = require('passport')
const User=require('../models/userSchema');
const { Admin } = require('mongodb');

const userAuth = (req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user)
            .then(user => {
                if (user && !user.isBlocked) {
                    req.user = user;
                    console.log('Authenticated User:', req.user);
                    next();
                } else {
                    res.redirect('/login');
                }
            })
            .catch(error => {
                console.error('Error in user auth middleware:', error);
                res.status(500).send('Internal server error');
            });
    } else {
        console.error('No user session found');
        res.redirect('/login');
    }
};


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
        adminAuth
    }