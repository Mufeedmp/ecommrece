require('dotenv').config();
const Product=require('../../models/productSchema')
const User=require('../../models/userSchema')
const Order=require('../../models/orderSchema')
const Wallet=require('../../models/walletSchema')
const Address=require('../../models/addressSchema')
const Cart =require('../../models/cartSchema')
const mongoose=require('mongoose')
const Coupon=require('../../models/couponSchema')
const Razorpay = require('razorpay');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');


const loadCart = async (req, res) => {
  try {
      if (req.session.passport) {
          req.session.user = req.session.passport.user;
      }
      if (req.session.user) {
          const userData = await User.findById(req.session.user);
          if (!userData) {
              return res.redirect('/login');
          }

          const cart = await Cart.findOne({ userId:userData }).populate('items.productId', 'salePrice productName quantity productImage');
          
          if (!cart || cart.items.length === 0) {
            return res.render('cart', { 
              user: userData, 
              cartItems: [], 
              cartSubtotal: 0, 
              totalOffer: 0, 
              cartTotal: 0, 
              emptyCart: true 
            });
          }

      const cartItems = await Promise.all(cart.items.map(async (item) => {
          const product = await Product.findById(item.productId._id).lean();
          
          if (product) {
              const sizeObject = product.size.find(sizes => sizes.sizeName === item.size);
              const availableStock = sizeObject ? sizeObject.quantity : 0;

              return {
                  productId: item.productId._id,
                  productName: item.productName,
                  productImage: item.productImage[0] ,
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


const addToCart = async (req, res,next) => {
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

      if (quantity > CART_LIMIT) {
        return res.status(400).json({ success: false, message: `You can only add up to ${CART_LIMIT} of this item.` });
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
                  totalPrice: product.salePrice * effectiveQuantity,
                  productOffer: discountPerUnit
              }],
              cartSubtotal: product.salePrice * effectiveQuantity, 
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
              if (newQuantity > CART_LIMIT ) {
                  return res.status(400).json({ success: false, message: `You can only add up to ${CART_LIMIT} of this item.` });
              }
              if (newQuantity > availableStock) {
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
      next(error);
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

    if(!userId){
      return res.redirect('/login')
    }

    const userData = await User.findById(userId);

    const cart=await Cart.findOne({ userId })

    if(!cart || cart.items.length===0){
      return res.redirect('/shop')
    }

     
      const addressDocument = await Address.findOne({ userId }); 
      const coupons=await Coupon.find()
      const savedAddresses = addressDocument ? addressDocument.address : [];
      const cartItems=cart.items
      
      res.render('checkout', {
         user: userData,
        savedAddresses: savedAddresses,
         cart,
          cartItems,
        coupons });
      
  
  } catch (error) {
    console.error("Error loading checkout:", error);
    res.status(500).send("Internal Server Error");
  }
}; 


  const applyCoupon=async (req,res) => {
    try {
      const {code,cartTotal}=req.body

      const coupon = await Coupon.findOne({ name: code });

      if (!coupon) {
        return res.status(400).json({ message: 'Invalid coupon. Please enter a valid code.' });
      }

      const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); 

    const expireDate = new Date(coupon.expireOn);
    expireDate.setHours(0, 0, 0, 0); 
    

    if (expireDate < currentDate) {
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
      const {savedAddress,paymentMethod,couponCode, ...newAddress } = req.body;

      const items = await Cart.findOne({ userId }).populate('items.productId', 'productName productImage size quantity salePrice');
      const totalAmount = items.cartTotal;

      let discount = 0; 

      if (couponCode) {
      const coupon=await Coupon.findOne({name:couponCode})

      if(!coupon){
       return res.status(400).json({message:'coupon not found'})
      }

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); 
  
      const expireDate = new Date(coupon.expireOn);
      expireDate.setHours(0, 0, 0, 0); 
      
    if (expireDate < currentDate) {
      return res.status(400).json({ message: 'Coupon has expired.' });
    }

    if (totalAmount < coupon.minPrice) {
      return res.status(400).json({ message: `Minimum purchase of ₹${coupon.minPrice} is required to use this coupon.` });
    }
    discount = coupon.offerPrice;

  }
     
      const totalQuantity = items.items.reduce((acc, item) => acc + item.quantity, 0);
      const discountPerQty = discount / totalQuantity;
      const netTotal=totalAmount-discount
   
      if(netTotal>1000){
        return res.status(400).json({success:false,message:'cash on delivery above 1000 not availabe'})
      }
   
      const orderItems = items.items.map(item => {
        const itemDiscount = discountPerQty * item.quantity;
        return {
        productId: item.productId._id, 
        name: item.productId.productName,  
        price: item.productId.salePrice,
        size:item.size,
        quantity: item.quantity,
        image:item.productId.productImage[0],  
        total: item.quantity * item.productId.salePrice,
        couponDiscount:Number(itemDiscount.toFixed(2)),
        netTotal:Number((item.quantity * item.productId.salePrice-itemDiscount).toFixed(2)),
        
      }
      });

    let selectedAddress;
        if (savedAddress) {
        const userAddresses = await Address.findOne({ 
            userId ,
            'address._id': savedAddress
        }).select('address');

     selectedAddress = userAddresses.address.find(addr => addr._id.toString() === savedAddress);
        if (!selectedAddress) {
          return res.status(400).json({ success: false, message: 'Invalid saved address.' });
        }
      } else {
        selectedAddress = { ...newAddress };
      }

  
      const order = new Order({
        userId,
        address: selectedAddress,
        items: orderItems,
        totalAmount:totalAmount-discount,
        paymentMethod: req.body.paymentMethod,
        discount:discount,
        totalQuantity:totalQuantity,
        status:'Confirmed',
        
      });
  
      await order.save();

    
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [], cartSubtotal: 0, cartTotal: 0 } }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Order placed successfully!',
      });
  
      
    } catch (error) {
      console.error(error);
      res.status(500).send('Something went wrong.');
    }
  };

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  const createOrder = async (req, res) => {
    let order = null;
    try {
      console.log("Full Request Body:", req.body);
      const { amount, savedAddress, paymentMethod,discount, newAddress } = req.body;

      console.log("Extracted Values:", { amount, savedAddress, paymentMethod, newAddress, discount });

  
      const userId = req.session.user;
      const items = await Cart.findOne({ userId }).populate('items.productId', 'productName productImage size quantity salePrice');
      const totalAmount = items.cartTotal
      const totalQuantity = items.items.reduce((acc, item) => acc + item.quantity, 0);
      const discountPerQty = discount / totalQuantity;
  
      const orderItems = items.items.map(item => {
        const itemDiscount = discountPerQty * item.quantity;
        return {
        productId: item.productId._id, 
        name: item.productId.productName,  
        price: item.productId.salePrice,
        size:item.size, 
        quantity: item.quantity,
        image:item.productId.productImage[0],  
        total: item.quantity * item.productId.salePrice,
        couponDiscount:Number(itemDiscount.toFixed(2)),
        netTotal:Number((item.quantity * item.productId.salePrice-itemDiscount).toFixed(2))
      }
      });
  
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
        selectedAddress = newAddress 
      }
  
      const order = new Order({
        userId,
        address: selectedAddress,
        items: orderItems,
        totalAmount:totalAmount-discount,
        paymentMethod,
        paymentStatus: 'Payment Pending',
        discount:discount,
        totalQuantity:totalQuantity 
      });
  
      await order.save();
  
    
  
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [], cartSubtotal: 0, cartTotal: 0 } }
      );
  
  
      const options = {
        amount: amount-(discount*100),
        currency: "INR",
        receipt: `order_rcptid_${Date.now()}`,
      };
  
      const razorPayOrder = await razorpay.orders.create(options);
      console.log(razorPayOrder)
    
      order.paymentOrderId = razorPayOrder.id;
      await order.save();
  
      res.status(200).json(razorPayOrder);
  
    } catch (error) {
      console.error(error);
      res.status(500).send("Error creating Razorpay order");
    }
  };
  

  

  const verifyPayment = async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body.response;
      
      
      
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).send({ status: "failure", message: "Invalid payment data" });
      }
      
      const hmac = crypto.createHmac("sha256", razorpay.key_secret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest("hex");
  
      if (generatedSignature === razorpay_signature) {
        const updatedOrder = await Order.findOneAndUpdate(
          { paymentOrderId: razorpay_order_id },
          {
            $set: {
              paymentStatus: "Successful",
              status: "Confirmed"
            }
          },
          { new: true }
        );
  
        if (!updatedOrder) {
          console.error('Order not found:', razorpay_order_id);
          return res.status(404).send({
            status: "failure",
            message: "Order not found"
          });
        }
  
        res.status(200).send({ status: "success", message: "Payment verified successfully" });
      } else {
        console.error('Invalid signature');
        res.status(400).send({ status: "failure", message: "Invalid signature" });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).send({ status: "failure", message: "Internal server error" });
    }
  };
  const payUsingWallet = async (req, res) => {
    try {
      const userId = req.session.user;
      const { amount, savedAddress, paymentMethod, discount, ...newAddress } = req.body;
    
      console.log('reqqq',req.body);
      
      const items = await Cart.findOne({ userId }).populate(
        'items.productId',
        'productName productImage size quantity salePrice'
      );
      const totalAmount = items.cartTotal;
      const totalQuantity = items.items.reduce((acc, item) => acc + item.quantity, 0);
      const discountPerQty = discount / totalQuantity;
    
      const orderItems = items.items.map(item => {
        const itemDiscount = discountPerQty * item.quantity;
        return {
          productId: item.productId._id,
          name: item.productId.productName,
          price: item.productId.salePrice,
          size: item.size,
          quantity: item.quantity,
          image: item.productId.productImage[0],
          total: item.quantity * item.productId.salePrice,
          couponDiscount: Number(itemDiscount.toFixed(2)),
          netTotal: Number((item.quantity * item.productId.salePrice - itemDiscount).toFixed(2)),
        };
      });
    
      let selectedAddress;
      if (savedAddress) {
        const userAddresses = await Address.findOne({
          userId,
          'address._id': savedAddress,
        }).select('address');
    
        selectedAddress = userAddresses.address.find(addr => addr._id.toString() === savedAddress);
        if (!selectedAddress) {
          return res.status(400).json({ success: false, message: 'Invalid saved address.' });
        }
      } else {
        selectedAddress = { ...newAddress };
      }
    
      
    
      const order = new Order({
        userId,
        address: selectedAddress,
        items: orderItems,
        totalAmount: totalAmount - discount,
        paymentMethod,
        discount,
        totalQuantity,
        status: 'Confirmed',
        paymentStatus: "Successful"
      });
    
      const savedOrder=await order.save();
  
      if (paymentMethod === 'wallet') {
        const userWallet = await Wallet.findOne({ userId }); 
        if (!userWallet || userWallet.balance < totalAmount - discount) {
          return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
        }
    
        userWallet.balance -= totalAmount - discount;
        userWallet.transactions.push({
          amount: totalAmount - discount,
          type: 'debit',
          description: `Payment for order ${savedOrder.orderId} `,
        });
  
        await userWallet.save();
      }
    
    
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [], cartSubtotal: 0, cartTotal: 0 } }
      );
      res.json({ success: true, message: 'Order placed successfully!' });
   
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
    
  };
  const orderSuccess=async (req,res,next) => {
    try { 
        const userId=req.session.user
        const userData=await User.findById(userId)
        const order = await Order.findOne({ userId }).sort({ orderDate: -1 }).populate('orderId');

        const stockUpdatePromises = order.items.map(async item => {
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

        res.render('orderSuccess', { order,user:userData });
    } catch (error) {
        next(error)
    }
 }

 const loadOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const page = req.query.page || 1;
        const limit = 6;
        const skip=(page-1)*limit

        const orders = await Order.find({ userId })
        .sort({ orderDate: -1 })
        .limit(limit)
        .skip(skip)

        const count=await Order.find().countDocuments()
        const totalPages=Math.ceil(count/limit)
        res.render('orders', {
           orders,user:userData,
           totalPages:totalPages,
           currentPage: page  
          });
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

const cancelOrder = async (req, res) => {
    try {
      const userId = req.session.user;
      const orderId = req.params.orderId;
  console.log('cancelOrder:', orderId);
  
      const order = await   Order.findOne  ({orderId}).populate('items.productId', 'name  size quantity ');
        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }
        if (order.status === 'Cancelled') {
            return res.status(400).json({ status: 'error', message: 'Order already cancelled' });
        }
        if (order.status === 'Delivered') {
            return res.status(400).json({status: 'error', message: 'Cannot cancel delivered order' });
        }
        order.status = 'Cancelled';
        order.paymentStatus = 'Refunded'

        if(order.paymentMethod==='online' || order.paymentMethod==='wallet'){
          const userId = order.userId;
          const returnAmount = order.totalAmount; 
    
          let wallet = await Wallet.findOne({ userId });
          if (!wallet) {
            wallet = new Wallet({ userId, balance: 0, transactions: [] });
          }
    
          wallet.balance += returnAmount;
          wallet.transactions.push({
            amount: returnAmount,
            type: 'credit',
            description: `Refund for order ${orderId}`,
          });
    
          await wallet.save();
    
        }

        const stockUpdatePromises = order.items.map(async item => {
            const productId = item.productId._id;
            const orderedQuantity = item.quantity;
            const size = item.size;
      
            
            return Product.findOneAndUpdate(
                { _id: productId, "size.sizeName": size }, 
                { $inc: { "size.$.quantity": orderedQuantity } }, 
                { new: true } 
            );
            });
      
         
          await Promise.all(stockUpdatePromises);

        await order.save();
        res.redirect('/orders');
    }
    catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).send('Internal Server Error');
    }
    }

   const cancelItem=async (req,res) => {
     const { orderId, productId } = req.params;
    try {
      const order = await Order.findOne({ orderId });

      if (!order) {
          return res.status(404).json({ message: 'Order not found' });
      }
      const itemIndex = order.items.findIndex(item => item.productId.toString() === productId);

      if (itemIndex === -1) {
          return res.status(404).json({ message: 'Item not found in order' });
      }
      const removedItem= order.items[itemIndex]              

      console.log('removedItem',removedItem);
      
     
        order.totalAmount -= removedItem.netTotal || 0;
        order.totalQuantity -= removedItem.quantity || 0;

        order.items[itemIndex].itemStatus = "Cancelled";

    
    const allCancelled = order.items.every(item => item.itemStatus === "Cancelled");
    if (allCancelled) {
      order.status = "Cancelled";
      order.totalAmount = 0;
      order.totalQuantity = 0;
   
    }
      
    await order.save()

      const canceledProductId  = removedItem.productId;
      const orderedQuantity = removedItem.quantity;
      const size = removedItem.size;
  
        
      await Product.findOneAndUpdate(
            { _id: canceledProductId , "size.sizeName": size }, 
            { $inc: { "size.$.quantity": orderedQuantity } }, 
            { new: true } 
        );


      if(order.paymentMethod==='online'|| order.paymentMethod==='wallet'){
      const userId = order.userId;
      const returnAmount = removedItem.netTotal || 0;


      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = new Wallet({ userId, balance: 0, transactions: [] });
      }

      wallet.balance += returnAmount;
      wallet.transactions.push({
        amount: returnAmount,
        type: 'credit',
        description: `Refund for order ${orderId}`,
      });

      await wallet.save();
    }
  
  const responseMessage =
  order.items.length === 0
    ? 'Order canceled successfully'
    : 'Item canceled successfully';

res.status(200).json({
  message: responseMessage,
  order,
});
  } catch (error) {
      console.error('Error canceling item:', error);
      res.status(500).json({ message: 'Failed to cancel item', error });
  }

   }


const returnOrder = async (req, res) => {
    try {
      const { orderId } = req.body;
  
      const order = await Order.findOne({ orderId: orderId }).populate('items.productId', 'name size quantity');
  
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
  
      if (order.status === 'Delivered') {

        


        order.status = 'Return requested';
        order.paymentStatus='Pending'
        await order.save();
  
       
  
        return res.status(200).json({
          message: 'Order returned successfully. Refund credited to wallet.'
        });
      } else {
        return res.status(400).json({ message: 'Order cannot be returned' });
      }
    } catch (error) {
      console.error('Error in returnOrder:', error.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
  const downloadInvoice = async (req, res) => {
    try {
      const order = await Order.findOne({ orderId: req.params.orderId })
        .populate('userId')
        .populate({
          path: 'items.productId',
          select: 'name price description'
        });
  
      if (!order) {
        return res.status(404).send('Order not found');
      }
  
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
    
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.orderId}.pdf`);

      doc.pipe(res);

      doc.fontSize(24)
         .fillColor('#333')
         .text('GENTS CLUB', 200, 50, { align: 'centre' })
        
         

      doc.strokeColor('#ddd')
         .lineWidth(1)
         .moveTo(50, 120)
         .lineTo(550, 120)
         .stroke();
  
      doc.fontSize(12)
         .fillColor('#666')
         .text(`Invoice Number: #${order.orderId || 'N/A'}`, 50, 150)
         .text(`Date: ${order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}`, 50, 170)
         .text(`Payment Method: ${order.paymentMethod || 'N/A'}`, 50, 190);
  
      doc.text('BILL TO:', 400, 150)
         .fillColor('#333')
         .text(`${order.userId?.name || 'N/A'}`, 400, 170)
         .text(`${order.userId?.email || 'N/A'}`, 400, 190)
         .text(`${order.address?.city || 'N/A'}`, 400, 210)
         .text(`${order.address?.landmark || 'N/A'}`, 400, 230)
         .text(`${order.address?.state || 'N/A'}`, 400, 250)
         .text(`${order.address?.pincode || 'N/A'}`, 400, 270)
         .text(`${order.address?.phone || 'N/A'}`, 400, 290)
         .text(`${order.address?.altphone || 'N/A'}`, 400, 310)
       
     
      const tableTop = 350;
      doc.fontSize(10)
         .fillColor('#666')
         .text('Product', 50, tableTop, { width: 250 })
         .text('Quantity', 300, tableTop)
         .text('Price', 400, tableTop)
         .text('Total', 500, tableTop);
  
      doc.strokeColor('#ddd')
         .lineWidth(1)
         .moveTo(50, tableTop + 20)
         .lineTo(550, tableTop + 20)
         .stroke();
  
      let yPosition = tableTop + 40;
      let totalAmount = 0;
      order.items.forEach(item => {
        const productName = item.name || 'Unknown Product';
        const quantity = item.quantity || 0;
        const price = item.price || 0;
        const itemTotal = quantity * price;
        totalAmount += itemTotal;
  
        doc.fillColor('#333')
           .text(productName, 50, yPosition, { width: 250 })
           .text(quantity.toString(), 300, yPosition)
           .text(`${price.toFixed(2)}`, 400, yPosition)
           .text(`${itemTotal.toFixed(2)}`, 500, yPosition);
        yPosition += 20;
      });

      const discount = order.discount || 0;
      const finalTotal = totalAmount - discount;
  
      doc.strokeColor('#ddd')
         .lineWidth(1)
         .moveTo(50, yPosition + 10)
         .lineTo(550, yPosition + 10)
         .stroke();
  
      doc.fontSize(12)
         .fillColor('#666')
         .text('Subtotal', 400, yPosition + 30)
         .fillColor('#333')
         .text(`${totalAmount.toFixed(2)}`, 500, yPosition + 30)
         .fillColor('#666')
         .text('Discount', 400, yPosition + 50)
         .fillColor('#333')
         .text(`${discount.toFixed(2)}`, 500, yPosition + 50)
         .fillColor('#666')
         .text('Total', 400, yPosition + 70, { bold: true })
         .fillColor('#333')
         .text(`${finalTotal.toFixed(2)}`, 500, yPosition + 70, { bold: true });
 
      doc.fontSize(8)
         .fillColor('#999')
         .text('Thank you for Purchasing With Us!', 50, 750, { align: 'center' });

      doc.end();
  
    } catch (error) {
      console.error('Invoice Download Error:', error);
      res.status(500).send('Error generating invoice');
    }
  };
  const retryPayment = async (req, res,next) => {
    const { paymentOrderId } = req.params;
    try {
   
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({ success: false, message: 'Razorpay keys not configured.' });
      }

      const order = await Order.findOne({ paymentOrderId });
  
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }
  
  
      if (isNaN(order.totalAmount) || order.totalAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid order amount.' });
      }
  

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
  
      const options = {
        amount: Math.round(order.totalAmount * 100),
        currency: 'INR',
        receipt: `order_rcptid_${Date.now()}`,
      };
  
      const razorpayOrder = await razorpay.orders.create(options);
  
      if (!razorpayOrder || razorpayOrder.status !== 'created') {
        throw new Error('Failed to create Razorpay order.');
      }
  
      order.paymentOrderId = razorpayOrder.id;
      order.paymentStatus = 'Payment Pending';
      await order.save();

      res.json({ 
        success: true,
        amount: order.totalAmount,
        currency: 'INR',
        razorPayOrderId: razorpayOrder.id,
        receipt: razorpayOrder.receipt,
      });
    } catch (error) {
      console.error('Retry Payment Error:', error);
      next(error);
    }
  };
  
  
  const retryVerifyPayment = async (req, res) => {
    try {
      const { response } = req.body;
      const order = await Order.findOne({ 'paymentOrderId': response.razorpay_order_id });
  
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
      }
  
      const crypto = require('crypto');
      const secret = process.env.RAZORPAY_KEY_SECRET;
      const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(response.razorpay_order_id + "|" + response.razorpay_payment_id)
        .digest('hex');
  
      if (generated_signature === response.razorpay_signature) {
        order.paymentStatus = 'Successful';
        order.status='Confirmed'
        order.transactionId = response.razorpay_payment_id;
        await order.save();
  
        return res.json({ 
          success: true, 
          message: 'Payment successful',
          orderId: order._id 
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: 'Payment verification failed' 
        });
      }
    } catch (error) {
      console.error("Payment Verification Error:", error);
      res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
  };



module.exports={
    loadCart,
    addToCart,
    updateCart,
    loadCheckout,
    removeItem,
    applyCoupon,
    placeOrder ,
    createOrder,
    verifyPayment,
    payUsingWallet,
    orderSuccess,
    returnOrder,    
    loadOrders,
    orderDetails,
    cancelOrder,
    cancelItem,
    downloadInvoice,
    retryPayment,
    retryVerifyPayment,

}    