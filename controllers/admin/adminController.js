const User=require('../../models/userSchema')
const bcrypt=require('bcrypt')
const mongoose=require('mongoose')


const loadLogin = (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect('/admin/dashboard'); 
        }
        res.render('admin-login',{ message: null });
    } catch (error) {
        console.log('login page error',error);
        return res.redirect('/pageerror')
    }
};


const login= async (req,res) => {
    try {
        const {email,password}=req.body
        const admin=await User.findOne({email,isAdmin:true})
        if(admin){
            const passwordMatch=await bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin=true
                return res.redirect('/admin/dashboard')
            }else{
                return res.redirect('/admin/login')
            }
        }else{
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.log('login error',error);
        return res.redirect('/pageerror')
        
    }
}


 const pageerror=async (req,res) => {
    res.render('admin-error')
 }


 const logout=async (req,res) => {
    try {
        req.session.destroy(err=>{
            if(err){
                console.log('error distroy session');
                return res.redirect('/pageerror')  
            }
            res.redirect('/admin/login')
        })
    } catch (error) {
        console.log('unexpected error occured');
        res.redirect('/pageerror')
    }
 }



module.exports={
    loadLogin,
    login,
    pageerror,
    logout
}