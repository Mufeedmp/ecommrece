const Product=require('../../models/productSchema')
const User=require('../../models/userSchema')
const Order=require('../../models/orderSchema')


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

const cancelOrder = async (req, res) => {
    try {
      const userId = req.session.user;
      const orderId = req.params.id;
  console.log('cancelOrder:', orderId);
  
      const order = await   Order.findById  (orderId).populate('items.productId', 'name  size quantity ');
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

   
const returnOrder=async(req,res)=>{
    
    try{
        const {orderId}=req.body
        const order = await Order.findOne({ orderId }).populate('items.productId', 'name  size quantity ');
        
        if(!order){
            return res.status(404).json({ message: 'Order not found' });
        }
        if(order.status=='Delivered'){
            order.status='Returned'
            order.save()
            res.redirect('/orders')
            return res.status(200).json({message:'Order returned successfully'})
        }
        else{
            res.redirect('/orders')
             res.status(400).json({message:'Order cannot be returned'})
        }
    }
    catch(error){
        console.error('error return order',error.message)
        res.status(500).json({message:'internal server error'})
        
    }
}

module.exports={
    returnOrder,
    orderSuccess,
    loadOrders,
    orderDetails,
    cancelOrder,
}