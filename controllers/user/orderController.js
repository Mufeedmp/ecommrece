const Product=require('../../models/productSchema')
const User=require('../../models/userSchema')
const Order=require('../../models/orderSchema')
const Wallet=require('../../models/walletSchema')


const orderSuccess=async (req,res) => {
    try { 
        const userId=req.session.user
        const userData=await User.findById(userId)
        const order = await Order.findOne({ userId }).sort({ orderDate: -1 }).populate('orderId');
        res.render('orderSuccess', { order,user:userData });
    } catch (error) {
        
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


        order.status = 'Returned';
        order.paymentStatus='Refunded'
        await order.save();
  
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


module.exports={
    returnOrder,
    orderSuccess,
    loadOrders,
    orderDetails,
    cancelOrder,
    cancelItem
}