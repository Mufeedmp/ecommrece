const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const User=require('../../models/userSchema')
const Cart=require('../../models/cartSchema')
const Address=require('../../models/addressSchema')
const Order=require('../../models/orderSchema')
const mongoose=require('mongoose')



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

        const availableSizes = {
            M: product.size.M, 
            L: product.size.L, 
            XL: product.size.XL
        };

        res.render('product-details',{
            user: userData,
            Products:product,
            category: findCategory,
            relatedProducts ,
            availableSizes
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
  
            const cartItems = [];
            if (cart && cart.items) {
                cart.items.forEach(item => {
                    cartItems.push({
                        productId:item.productId, 
                        productName: item.productName,
                        productImage: item.productImage[0] || 'default-image.jpg', 
                        salePrice: item.salePrice,
                        quantity: item.quantity,
                        totalPrice: item.salePrice * item.quantity, 
                    });
                });
            }
            res.render('cart', { user: userData, cartItems});
        } else {
            res.render('cart', { cartItems: [] });
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
     
        

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (!size || !['M', 'L', 'XL'].includes(size)) {
            return res.status(400).json({ success: false, message: 'Invalid size selected' });
        }

        const availableStock = product.size[size];
        if (availableStock < quantity) {
            return res.status(400).json({ success: false, message: `Not enough stock for size ${size}` });
        }

        const productImage = product.productImage && product.productImage.length > 0 ? product.productImage[0] : null;
        if (!productImage) {
            return res.status(400).json({ success: false, message: 'Product image not available' });
        }
        let cart = await Cart.findOne({ userId: userId });
       
        if (!cart) {
            cart = new Cart({
                userId: userId,
                items: [{
                    productId: productId,
                    quantity: quantity,
                    size: size,
                    productName:product.productName,  
                    salePrice:product.salePrice, 
                    quantity: product.quantity, 
                    productImage:product.productImage[0],
                    totalPrice:product.salePrice*quantity,
                }],
                cartSubtotal: product.salePrice * quantity,
                cartTotal: product.salePrice * quantity,
            });
           
            await cart.save();
            return res.status(200).json({ success: true, message: 'Item added to cart successfully!' });
        }
        if (Array.isArray(cart.items)) {
            const existingProduct = cart.items.find(item => item.productId.toString() === productId);
            if (existingProduct) {
                existingProduct.quantity += quantity;  
                existingProduct.totalPrice = existingProduct.salePrice * existingProduct.quantity; 
            } else {
                cart.items.push({
                    productId: productId,
                    quantity: quantity,
                    size: new Map([['size', size]]),
                    productName:product.productName, 
                    quantity: product.quantity,
                    salePrice:product.salePrice, 
                    productImage:product.productImage[0],
                    totalPrice:product.salePrice*quantity
                });
            } 

        const cartSubtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

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
        const { productId, quantity} = req.body;
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

        const availableStock = product.size[item.size];
        if (quantity > availableStock) {
            return res.status(400).json({ message: `Insufficient stock for size ${size}` });
        }
        console.log('availableStock',availableStock);
        
        // Update quantity and total price
        item.quantity = quantity;
        item.totalPrice = item.quantity * product.salePrice;

        // Recalculate cart total and subtotal
        const cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
        cart.cartTotal = cartTotal;
        cart.cartSubtotal = cartTotal; // You may want to handle discounts or other factors here

        // Save updated cart to database
        await cart.save();

        // Respond with updated cart details
        res.json({
            success: true,
            message: 'Cart updated successfully',
            cartTotal: parseFloat(cartTotal.toFixed(2)),
            cartSubtotal: parseFloat(cart.cartSubtotal.toFixed(2)), // Fixed here
            items: cart.items.map(item => ({
                productId: item.productId._id,
                productName: item.productName,
                productImage: item.productImage[0],
                quantity: item.quantity,
                size: item.size,
                salePrice: item.salePrice,
                totalPrice: item.totalPrice,
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
  
        const savedAddresses = addressDocument ? addressDocument.address : [];
        const cartItems=cart.items
        
        res.render('checkout', { user: userData, savedAddresses: savedAddresses, cart, cartItems });

      } else {
        res.redirect('/'); 
      }
    } catch (error) {
      console.error("Error loading checkout:", error);
      res.status(500).send("Internal Server Error");
    }
  }; 

  const placeOrder = async (req, res) => {
    try {
      const userId = req.session.user;
      const { savedAddress,paymentMethod, ...newAddress } = req.body;

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
  console.log("selectedAddress",selectedAddress);
  
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
        const orderedQuantity = item.size;
        const size = item.size;
  
        
        return Product.findByIdAndUpdate(
            productId,
            { $inc: { [`size.${size}`]: -orderedQuantity } },
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
  
  
  
 const orderSuccess=async (req,res) => {
    try { 
        const order = await Order.findOne({ userId: req.session.user }).sort({ orderDate: -1 }).populate('orderId');
        res.render('orderSuccess', { order });
    } catch (error) {
        
    }
 }

 const loadOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const orders = await Order.find({ userId }).sort({ orderDate: -1 });

        res.render('orders', { orders,user:userData });
    } catch (error) {
        console.error('Error loading orders:', error.message);
        res.status(500).send('Internal Server Error');
    }
}

const orderDetails=async (req,res) =>   {
    try {
        const userId=req.session.user
        const userData=await User.findById(userId)
        const orderId=req.params.id
        const order=await Order.findById(orderId)
        res.render('orderDetails',{
            user:userData,
            order,
            address:order.address,
            items:order.items

        })
    }
    catch (error) {
        console.error('Error fetching order details:', error.message);
        res.status(500).send('Internal Server Error');
    }

}

module.exports={
    productDetails,
    loadCart,
    addToCart,
    updateCart,
    loadCheckout,
    removeItem,
    placeOrder ,
    orderSuccess,
    loadOrders,
    orderDetails
}