const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const Cart=require('../../models/cartSchema')
const Address=require('../../models/addressSchema')
const Order=require('../../models/orderSchema')
const mongoose=require('mongoose')
const Wishlist=require('../../models/wishlistSchema')
const Coupon=require('../../models/couponSchema')
const Razorpay = require('razorpay')
const crypto = require("crypto");



const loadShopPage=async (req,res) => {
    try {
        if(req.session.passport){
            req.session.user=req.session.passport.user
        }
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
        

 
        if(req.session.user){
           const userData=await User.findOne({_id:req.session.user}) 
           
          return res.render('shop',{user:userData,Products:productData,categories,});
        }else{
            return res.render('shop',{Products:productData,categories})
        }
        
    } catch (error) {
        console.error('Error loading homepage:', error);
        res.status(500).send('Server Error');
    }
}
const productDetails=async (req,res) => {
    try {
        const userId=req.session.user
        const userData=await User.findById(userId)
        const productId=req.params.id
        
        const product=await Product.findById(productId).populate('category')

        
        
        const findCategory=product.category

        const categories = await Category.find();

        const relatedProducts = await Product.find({
            category: findCategory._id,
            _id: { $ne: productId }, 
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
const loadCart = async (req, res) => {
    try {
        if (req.session.passport) {
            req.session.user = req.session.passport.user;
        }
        if (req.session.user) {
            const userData = await User.findById(req.session.user);
            if (!userData) {
                return res.render('cart', { cartItems: []  });
            }

            const cart = await Cart.findOne({ userId:userData }).populate('items.productId', 'salePrice productName quantity productImage');
            

        const cartItems = await Promise.all(cart.items.map(async (item) => {
            const product = await Product.findById(item.productId._id).lean();
            
            if (product) {
                const sizeObject = product.size.find(sizes => sizes.sizeName === item.size);
                const availableStock = sizeObject ? sizeObject.quantity : 0;

                return {
                    productId: item.productId._id,
                    productName: item.productName,
                    productImage: item.productImage[0] || 'default-image.jpg',
                    salePrice: item.salePrice,
                    regularPrice:item.regularPrice,
                    quantity: item.quantity,
                    size: item.size,
                    totalPrice: item.totalPrice,
                    availableStock: availableStock, 
                };
            }

            return null;
        }));

        const validCartItems = cartItems.filter(item => item !== null);
            res.render('cart', { 
                user: userData,
                 cartItems:validCartItems,
                 cartSubtotal: cart.cartSubtotal, 
                totalOffer: cart.totalOffer, 
                cartTotal: cart.cartTotal, 
            });
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        res.status(500).send('Error loading cart');
    }
};

 
const addToCart = async (req, res) => {
    try {
        const { productId,quantity,size } = req.body;
        const userId = req.session.user
        const CART_LIMIT = 5;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
       
        const sizeObject = product.size.find(item => item.sizeName === size);
        
        const availableStock = sizeObject.quantity;
        
        if (availableStock < quantity) {
            return res.status(400).json({ success: false, message: `Not enough stock for size ${size}` });
        }


        const productImage = product.productImage && product.productImage.length > 0 ? product.productImage[0] : null;
        if (!productImage) {
            return res.status(400).json({ success: false, message: 'Product image not available' });
        }
        let cart = await Cart.findOne({ userId: userId });
       
        if (!cart) {
            const effectiveQuantity = Math.min(quantity, CART_LIMIT, availableStock);
            const discountPerUnit = product.regularPrice - product.salePrice;
            const totalOfferForProduct = discountPerUnit * effectiveQuantity;
        
            cart = new Cart({
                userId: userId,
                items: [{
                    productId: productId,
                    quantity: effectiveQuantity,
                    size: size,
                    productName: product.productName,
                    salePrice: product.salePrice,
                    regularPrice: product.regularPrice,
                    productImage: product.productImage[0],
                    totalPrice: product.regularPrice * effectiveQuantity,
                    productOffer: discountPerUnit
                }],
                cartSubtotal: product.regularPrice * effectiveQuantity, 
                totalOffer: totalOfferForProduct,
                cartTotal: product.salePrice * effectiveQuantity 
            });
       
            await cart.save();
            return res.status(200).json({ success: true, message: 'Item added to cart successfully!' });
        }
        if (Array.isArray(cart.items)) {
            const existingProduct = cart.items.find(item => item.productId.toString() === productId && item.size === size);
            if (existingProduct) {
                const newQuantity = existingProduct.quantity + quantity; 
                if (newQuantity > CART_LIMIT) {
                    return res.status(400).json({ success: false, message: `You can only add up to ${CART_LIMIT} of this item.` });
                }
                if (newQuantity > sizeObject.availableStock) {
                    return res.status(400).json({ success: false, message: 'Not enough stock available for this size' });
                }
                existingProduct.quantity = newQuantity;
                existingProduct.totalPrice = existingProduct.salePrice * existingProduct.quantity; 
            } else {
                const allowedQuantity = Math.min(quantity, CART_LIMIT,availableStock);
                cart.items.push({
                    productId: productId,
                    quantity: allowedQuantity,
                    size: size,
                    productName:product.productName,  
                    salePrice:product.salePrice,
                    regularPrice:product.regularPrice, 
                    productImage:product.productImage[0],
                    totalPrice:product.salePrice*quantity,
                    productOffer:product.regularPrice-product.salePrice,
                    
                });
            } 

        const cartSubtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        cart.totalOffer=product.regularPrice-product.salePrice
        cart.cartSubtotal = cartSubtotal;
        cart.cartTotal = cartSubtotal; 

            await cart.save(); 
            return res.status(200).json({ success: true, message: 'Item added to cart successfully!' });
        } else {
            return res.status(500).json({ success: false, message: 'Cart products are not available' });
        }
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'An error occurred while adding the item to the cart' });
    }
};

const updateCart = async (req, res) => {
    try {
        const { productId,size, quantity} = req.body;
        const userId = req.session.user;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid product ID' });
        }
        if (!quantity || typeof quantity !== 'number' || quantity < 1) {
            return res.status(400).json({ message: 'Invalid quantity' });
        }
        


        const cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const item = cart.items.find(item => item.productId.toString() === productId.toString() );
        if (!item) return res.status(404).json({ message: 'Product not found in cart' });

        const product = await Product.findById(productId).lean();
        if (!product) {
            return res.status(404).json({ message: 'Product not found in database' });
        }
        

        const sizeObject = product.size.find(sizes => sizes.sizeName === size);
        if (!sizeObject) {
            return res.status(400).json({ message: `Invalid size ${size}` });
        }
        
        const availableStock =sizeObject.quantity;
        
        if (quantity > availableStock) {
            return res.status(400).json({ message: `Insufficient stock for size: ${sizeObject.sizeName}. Available stock: ${availableStock}` });
        }
        
        
        item.quantity = quantity;
        item.totalPrice = item.quantity * product.salePrice;

       
        const cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        cart.cartTotal = cartTotal;
        cart.cartSubtotal = cartTotal; 

   
        await cart.save();

        
        res.json({
            success: true,
            message: 'Cart updated successfully',
            cartTotal: parseFloat(cartTotal.toFixed(2)),
            cartSubtotal: parseFloat(cart.cartSubtotal.toFixed(2)),
            items: cart.items.map(item => ({
                productId: item.productId._id,
                productName: item.productName,
                productImage: item.productImage[0],
                quantity: item.quantity,
                size: item.size,
                salePrice: item.salePrice,
                regularPrice:item.regularPrice,
                totalPrice: item.totalPrice,
                availableStock: sizeObject.quantity,
            })),
        });
    } catch (error) {
        console.error(`Error updating cart for user ${req.session.user}:`, error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const removeItem = async (req, res) => {
    const userId = req.session.user; 
    const { productId, size } = req.body;

    console.log('removeItem:', productId, size);
    

    try {

        if (!productId || !size || !['M', 'L', 'XL'].includes(size)) {
            return res.status(400).json({ message: 'Invalid productId or size' });
        }

      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
      }
  
      const result = await Cart.updateOne(
        { userId: userId },
        { $pull: { items: { productId: productId, size: size  } } } 
      );
  
      if (result.modifiedCount > 0) {
     
        const updatedCart = await Cart.findOne({ userId });
  
        const cartTotal = updatedCart.items.reduce(
          (total, item) => total + item.totalPrice, 0
        );
        const subTotal = cartTotal;
        updatedCart.cartTotal = cartTotal;
        updatedCart.cartSubtotal = subTotal;
  
        await updatedCart.save();
        res.status(200).send('Item deleted successfully');
      } else {
        res.status(404).send('Item not found in the cart');
      }
    } catch (error) {
      console.error('Error deleting cart item:', error);
      res.status(500).send('Internal Server Error');
    }
  }; 
  


  const loadCheckout = async (req, res) => {
    try {
      const userId = req.session.user;
      if (userId) {
        const userData = await User.findById(userId);
        const addressDocument = await Address.findOne({ userId });
        const cart=await Cart.findOne({ userId })
        const coupons=await Coupon.find()
        const savedAddresses = addressDocument ? addressDocument.address : [];
        const cartItems=cart.items
        
        res.render('checkout', { user: userData, savedAddresses: savedAddresses, cart, cartItems,coupons });

      } else {
        res.redirect('/'); 
      }
    } catch (error) {
      console.error("Error loading checkout:", error);
      res.status(500).send("Internal Server Error");
    }
  }; 

  const applyCoupon=async (req,res) => {
    try {
      const {code,cartTotal}=req.body

      const coupon=await Coupon.findOne({name:code})

      if(!coupon){
        res.status(400).json({message:'coupon not found'})
      }

      const currentDate = new Date();
    if (coupon.expiryDate < currentDate) {
      return res.status(400).json({ message: 'Coupon has expired.' });
    }

    if (cartTotal < coupon.minPrice) {
      return res.status(400).json({ message: `Minimum purchase of ₹${coupon.minPrice} is required to use this coupon.` });
    }
    
    const discount=coupon.offerPrice

    const newTotal=cartTotal-discount

   
    res.status(200).json({
      message: 'Coupon applied successfully',
      newTotal: newTotal,
      discount: discount,
    });

    } catch (error) {
      console.error(error)
        res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  const placeOrder = async (req, res) => {
    try {
      const userId = req.session.user;
      const { amount,savedAddress,paymentMethod, ...newAddress } = req.body;

      console.log('bodyy',req.body);

      const items = await Cart.findOne({ userId }).populate('items.productId', 'productName productImage size quantity salePrice');
      const totalAmount = items.cartTotal;  
    
      const orderItems = items.items.map(item => ({
        productId: item.productId._id, 
        name: item.productId.productName,  
        price: item.productId.salePrice,
        size:item.size,
        quantity: item.quantity,
        image:item.productId.productImage[0],  
        total: item.quantity * item.productId.salePrice,  
      }));
  

    let selectedAddress;
        if (savedAddress) {
        const userAddresses = await Address.findOne({ 
            userId ,
            'address._id': savedAddress
        }).select('address');

     selectedAddress = userAddresses.address.find(addr => addr._id.toString() === savedAddress);
        if (!selectedAddress) {
          return res.status(400).send('Invalid saved address.');
        }
      } else {
        selectedAddress = { ...newAddress };
      }

     
  
      const order = new Order({
        userId,
        address: selectedAddress,
        items: orderItems,
        totalAmount,
        paymentMethod: req.body.paymentMethod,
    
   
      });
  
      await order.save();

    
    const stockUpdatePromises = items.items.map(async item => {
        const productId = item.productId._id;
        const orderedQuantity = item.quantity;
        const size = item.size;
  
        
        return Product.findOneAndUpdate(
            { _id: productId, "size.sizeName": size }, 
            { $inc: { "size.$.quantity": -orderedQuantity } }, 
            { new: true } 
        );
        });
  
     
      await Promise.all(stockUpdatePromises);
  
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [], cartSubtotal: 0, cartTotal: 0 } }
      );
  
     
        res.redirect('/orderSuccess');
      
    } catch (error) {
      console.error(error);
      res.status(500).send('Something went wrong.');
    }
  };

  const razorpay = new Razorpay({
    key_id: 'rzp_test_NwltbJ8WRRxJmi',
    key_secret: 'HCBhVB0J6fqfdeUvtNpeaqa9', 
  });

  const createOrder = async (req, res) => {
    let order = null;
    try {
      const { amount, savedAddress, paymentMethod, ...newAddress } = req.body;
      console.log('Request Body:', req.body);
  
      const userId = req.session.user;
      const items = await Cart.findOne({ userId }).populate('items.productId', 'productName productImage size quantity salePrice');
      const totalAmount = items.cartTotal
  
      const orderItems = items.items.map(item => ({
        productId: item.productId._id,
        name: item.productId.productName,
        price: item.productId.salePrice,
        size: item.size,
        quantity: item.quantity,
        image: item.productId.productImage[0],
        total: item.quantity * item.productId.salePrice,
      }));
  
      let selectedAddress;
      if (savedAddress) {
        const userAddresses = await Address.findOne({
          userId,
          'address._id': savedAddress
        }).select('address');
  
        selectedAddress = userAddresses.address.find(addr => addr._id.toString() === savedAddress);
        if (!selectedAddress) {
          return res.status(400).send('Invalid saved address.');
        }
      } else {
        selectedAddress = { ...newAddress };
      }
  
      const order = new Order({
        userId,
        address: selectedAddress,
        items: orderItems,
        totalAmount,
        paymentMethod,
        status: 'Pending', 
      });
  
      await order.save();
  
      const stockUpdatePromises = items.items.map(async item => {
        const productId = item.productId._id;
        const orderedQuantity = item.quantity;
        const size = item.size;
  
        return Product.findOneAndUpdate(
          { _id: productId, "size.sizeName": size },
          { $inc: { "size.$.quantity": -orderedQuantity } },
          { new: true }
        );
      });
  
      await Promise.all(stockUpdatePromises);
  
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [], cartSubtotal: 0, cartTotal: 0 } }
      );
  
  
      const options = {
        amount: amount,
        currency: "INR",
        receipt: `order_rcptid_${Date.now()}`,
      };
  
      const razorPayOrder = await razorpay.orders.create(options);
  
    
      order.paymentOrderId = razorPayOrder.id;
      await order.save();
  
      res.status(200).json(razorPayOrder);
  
    } catch (error) {
      console.error(error);
  
      
      if (order) {
        order.status = 'failed';
        await order.save();
      }
  
      res.status(500).send("Error creating Razorpay order");
    }
  };
  

  

const verifyPayment=async (req,res) => {
    

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        console.log('body',req.body);

        
    
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature|| !order_id) {
          return res.status(400).send({ status: "failure", message: "Invalid payment data" });
        }
  
        const hmac = crypto.createHmac("sha256", "YOUR_KEY_SECRET");
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest("hex");
    
        if (generatedSignature === razorpay_signature) {
          
          res.status(200).send({ status: "success", message: "Payment verified successfully" });
          await Order.findOneAndUpdate(
            { orderId: order_id },
            {
              $set:{
                paymentStatus: "Successful"
              }
            },
            { new: true }
          );
      
        } else {
          res.status(400).send({ status: "failure", message: "Invalid signature" });
        }


      } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).send({ status: "failure", message: "Internal server error" });
      }
};


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
    loadCart,
    addToCart,
    updateCart,
    loadCheckout,
    removeItem,
    applyCoupon,
    placeOrder ,
    loadWishlist,
    addToWishlist,
    removeFromWishlist,
    createOrder,
    verifyPayment
};
 