const mongoose = require('mongoose');
const Order=require('../../models/orderSchema') 
const User=require('../../models/userSchema')



const customers=async (req,res) => {
    if (!req.session.admin) {
        return res.redirect('/admin/login'); 
    }
    try {
        let search= ''
        if(req.query.search){
            search=req.query.search
        }
        let page=1
        if(req.query.page){
            page=parseInt(req.query.page)
        }
        const limit=5

        const userData=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:'.*'+search+'.*', $options: 'i'}},
                {email:{$regex:'.*'+search+'.*', $options: 'i'}}
            ]
        })
        .limit(limit)
        .skip((page-1)*limit)
        .exec()

        const count=await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:'.*'+search+'.*', $options: 'i'}},
                {email:{$regex:'.*'+search+'.*', $options: 'i'}} 
            ]
        }).countDocuments()

       res.render('customers', {
            data: userData,       
            totalpages: Math.ceil(count / limit), 
            currentPage: page     
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.redirect('/admin/pageerror'); 
    }
};

const customerBlocked=async (req,res) => {
    try {
        let id=req.query.id
        console.log("Blocking user with ID:", id)
        await User.updateOne({_id: id},{$set:{isBlocked:true}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

const customerunBlocked=async (req,res) => {
    try {
        let id=req.query.id
        await User.updateOne({_id: id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}




module.exports={
    customers,
    customerBlocked,
    customerunBlocked,
    
}