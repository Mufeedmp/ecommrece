const mongoose = require('mongoose');
const Order=require('../../models/orderSchema') 
const User=require('../../models/userSchema')



const customers=async (req,res) => {
    try {
        let search= ''
        if(req.query.search){
            search=req.query.search
        }
        let page=1
        if(req.query.page){
            page=parseInt(req.query.page)
        }
        const limit=3

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

const orderList=async (req,res) => {
    try {
        let page=1
        if(req.query.page){
            page=parseInt(req.query.page)
        }
        const limit=6

        const orders=await Order.find()
        .populate('userId')
        .limit(limit)
        .skip((page-1)*limit)
        .exec()

        const count=await Order.find().countDocuments()
       res.render('orderList', {
            orders,       
            totalpages: Math.ceil(count / limit), 
            currentPage: page     
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.redirect('/admin/pageerror'); 
    }
}
const orderDetails=async (req,res) => {
    const orderId = req.params.id;
    
    try {
        const order = await Order.findById(orderId)
        .populate("userId")
        .populate("address")
        .exec();
      if (!order) {
        return res.status(404).send("Order not found");
      }
      res.render("order-details", { order });
  
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Server Error");
    }
}
const updateOrderStatus = async (req, res) => {
    try {
      const orderId = req.query.id;
      const status = req.body.orderStatus;
      console.log('oderid is here',orderId);
      console.log('ststus is here',status);
      
      
      
      const validStatuses = ["Pending", "Shipped", "Delivered", "Cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid order status" });
      }
      
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      
      if (order.status === "Delivered" || order.status === "Cancelled") {
        return res.status(403).json({ success: false, 
            message:`Order status cannot be updated to '${status}'`
         });
      }
      
      order.status = status;
      await order.save();
      
      res.status(200).json({ success: true, message: "Order status updated successfully", newStatus: order.status });
      
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
  


module.exports={
    customers,
    customerBlocked,
    customerunBlocked,
    orderList,
    orderDetails,
    updateOrderStatus
}