const { session } = require('passport')
const User=require('../models/userSchema');
const { Admin } = require('mongodb');

const userAuth=(req,res,next)=>{
    if(req.session.user){
       User.findById(req.session.user)
       .then(data=>{
        if(data && !data.isBlocked){
            next()
        }else{
            res.redirect('/login')
        }
       })
       .catch(error=>{
           console.log('error in user auth middle ware');
           res.status(500).send('internal server error')
           
       });
    
    }else{
        res.redirect('/login')
    }
}

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