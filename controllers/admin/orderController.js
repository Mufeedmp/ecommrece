const mongoose = require('mongoose');
const Order=require('../../models/orderSchema') 
const User=require('../../models/userSchema')
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');

const orderList=async (req,res) => {
    try {
      
        const page=parseInt(req.query.page)||1
        const limit=6
        const skip=(page-1)*limit

        const orders=await Order.find()
        .populate('userId')
        .sort({createdAt:-1})
        .limit(limit)
        .skip(skip)
        

        const count=await Order.find().countDocuments()
        const totalPages=Math.ceil(count/limit)
        res.render('orderList', {
            orders,       
            totalPages:totalPages,
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

  const loadReport=async (req,res) => {
    try {
      const page=parseInt(req.query.page)||1
        const limit=6
        const skip=(page-1)*limit

      const order=await Order.find({status:{$in:["Delivered","Returned"]}})
      .populate('userId')
      .sort({createdAt:-1})
      .limit(limit)
      .skip(skip)


      const count=await Order.find().countDocuments()
      const totalPages=Math.ceil(count/limit)
      res.render('reports',{
        order,
        totalPages:totalPages,
        currentPage: page     
      })
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.redirect('/admin/pageerror'); 
    }
  }

  const loadExcel=async (req,res) => {
    try {
      const orders = await Order.find({status:{$in:["Delivered","Returned"]}}).lean()
      .populate('userId');

      
      const data = orders.map((order) => ({
        ID: order.orderId,
        Name: order.userId?.name || 'N/A',
        Email: order.userId?.email || 'N/A',
        Total: `₹${order.totalAmount}`,
        Status: order.status,
        Date: new Date(order.createdAt).toLocaleDateString(),
      }));
  
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(data);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Orders');

      const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error generating Excel file:', error);
      res.status(500).send('Could not generate Excel file');
    }
  }

  
  module.exports={
    orderList,
    orderDetails,
    updateOrderStatus,
    loadExcel ,
    loadReport
  }