const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const Cart=require('../../models/cartSchema')
const Wishlist=require('../../models/wishlistSchema')




const loadShopPage=async (req,res,next) => {
    try {
        const userId=req.session.user

        const query = req.query.query?.trim() || '';
        const sortOption =req.query.sort || '';
        const selectedCategory = req.query.category || '';
        const categories=await Category.find({isListed:true})
        const listedCategoryIds = categories.map(category => category._id);
        
    
    let sortCriteria = {};
    switch (sortOption) {
      case 'popularity':
        sortCriteria = { popularity: -1 }; 
        break;
      case 'price-asc':
        sortCriteria = { salePrice: 1 }; 
        break;
      case 'price-desc':
        sortCriteria = { salePrice: -1 }; 
        break;
      case 'new-arrivals':
        sortCriteria = { createdAt: -1 }; 
        break;
      case 'a-z':
        sortCriteria = { productName: 1 }; 
        break;
      case 'z-a':
        sortCriteria = { productName: -1 }; 
        break;
      default:
        sortCriteria = { createdAt: -1 }; 
    }

    let productQuery = {
        isBlocked: false,
        productName: { $regex: query, $options: 'i' }, 
        category: { $in: listedCategoryIds } 
    };

    if (selectedCategory) {
        productQuery.category = selectedCategory;
    }
     
        let productData=await Product.find(productQuery)
        .populate('category') .sort(sortCriteria)
        

 
        if(userId){
            const userData=await User.findById(userId) 
           
          return res.render('shop',{user:userData,Products:productData,categories,});
        }else{
            return res.render('shop',{Products:productData,categories})
        }
        
    } catch (error) {
        next(error);
    }
}
const productDetails=async (req,res) => {
    try {
        const userId=req.session.user
        const userData=await User.findById(userId)
        const productId=req.params.id
        
        const product=await Product.findById(productId).populate('category')

        if (!product || product.isBlocked || (product.category && !product.category.isListed)) {
            return res.redirect('/shop');
        }
        
        const findCategory=product.category

        const categories = await Category.find();

        const relatedProducts = await Product.find({
            category: findCategory._id,
            _id: { $ne: productId }, 
            isBlocked: false
        }).limit(4);

        const availableSizes = {
            M: product.size.M, 
            L: product.size.L, 
            XL: product.size.XL
        };

        const cart = await Cart.findOne({ userId: userData })
        let cartQuantity = 0;
        if (cart) {
            const cartProduct = cart.items.find(item => item.productId.toString() === productId);
            cartQuantity = cartProduct ? cartProduct.quantity : 0;
        }

        

        res.render('product-details',{
            user: userData,
            Products:product,
            category: findCategory,
            relatedProducts ,
            availableSizes,
            cartQuantity ,
            categories
        }) 
        
    } catch (error) {
        console.error('Error fetching product details:', error.message);
        res.status(500).send('Internal Server Error');
    }
}


  const loadWishlist = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId');
        const categories = await Category.find();
        res.render('wishlist', { user: userData, wishlist, categories });
    } catch (error) {
        console.error('Error loading wishlist:', error.message);
        res.status(500).send('Internal Server Error');
    }
};
const addToWishlist = async (req, res) => {
try {
    const userId = req.session.user;
    const { productId } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
        const newWishlist = new Wishlist({
            userId,
            items: [{ productId }],
        });
        await newWishlist.save();
        return res.status(200).json({ message: 'Product added to wishlist' });
    }
    if (wishlist.products.find(item => item.productId.toString() === productId)) {
        return res.status(400).json({ message: 'Product already in wishlist' });
    }
    wishlist.products.push({ productId });
    await wishlist.save();
    res.status(200).json({ message: 'Product added to wishlist' });
} catch (error) {
    console.error('Error adding product to wishlist:', error.message);
    res.status(500).json({ message: 'Internal server error' });
}
}

const removeFromWishlist = async (req, res) => {
try {
    const userId = req.session.user;
    const { productId } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
        return res.status(404).json({ message: 'Wishlist not found' });
    }

    const productIndex = wishlist.products.findIndex(
        item => item.productId.toString() === productId
    );

    if (productIndex === -1) {
        return res.status(400).json({ message: 'Product not in wishlist' });
    }

    wishlist.products.splice(productIndex, 1);

    await wishlist.save();

    res.status(200).json({ message: 'Product removed from wishlist' });
} catch (error) {
    console.error('Error removing product from wishlist:', error.message);
    res.status(500).json({ message: 'Internal server error' });
}
};





module.exports = {
    loadShopPage,
    productDetails,
    loadWishlist,
    addToWishlist,
    removeFromWishlist,
    
};
 