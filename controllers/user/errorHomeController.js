const User = require('../../models/userSchema');
const Category=require('../../models/categorySchema')
const Product=require('../../models/productSchema')


const loadHomepage = async (req, res) => {
    try {
        if(req.session.passport){
            req.session.user=req.session.passport.user
        }
        
        const categories=await Category.find({isListed:true})
        const listedCategoryIds = categories.map(category => category._id);
    
       
        let productData=await Product.find({
            isBlocked:false,
            category: { $in: listedCategoryIds } 
            
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

const pageNotFound = async (req, res) => {
    try {
        res.render('page-404');
    } catch (error) {
       
        res.redirect('/PageNotFound');
    }
};


module.exports={
    loadHomepage,
    pageNotFound
}