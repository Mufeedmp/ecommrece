const Product=require('../../models/productSchema')
const Category = require('../../models/categorySchema')
const User = require('../../models/userSchema')
const fs=require('fs')
const path=require('path')
const sharp=require('sharp')


const getProductAddPage=async (req,res) => {
    try {
        const category=await Category.find({isListed:true})
        res.render('product-add',{
            cat:category
        })
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const addProducts=async (req,res) => {
    try {
        const products=req.body
        const productExists=await Product.findOne({
          productName:products.productName 
        })
        if(productExists){
            const images=[]

            if(req.files&&req.files.length>0 ){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath=req.files[i].path

                    const resizedImagepath=path.join('public','uploads','product-images',req.files[i].filename)
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagepath)
                }
            }
        }
    } catch (error) {
        
    }
}


module.exports={
    getProductAddPage,
    addProducts
}