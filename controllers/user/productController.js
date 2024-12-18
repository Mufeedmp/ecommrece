const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')

const productDetails=async (req,res) => {
    try {
        const userId=req.session.user
        const userData=await User.findById(userId)
        const productId=req.params.id
        
        
        const product=await Product.findById(productId).populate('category')
        const findCategory=product.category


        const relatedProducts = await Product.find({
            category: findCategory._id,
            _id: { $ne: productId }, 
        }).limit(4);

        res.render('product-details',{
            user: userData,
            Products:product,
            category: findCategory,
            relatedProducts 
        }) 
        
    } catch (error) {
        console.error('Error fetching product details:', error.message);
        res.status(500).send('Internal Server Error');
    }
}



module.exports={
    productDetails
}