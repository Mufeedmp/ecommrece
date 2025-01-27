const mongoose = require('mongoose');
const Order=require('../../models/orderSchema') 
const User=require('../../models/userSchema')
const xlsx = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const moment = require('moment');

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
      if(order.status==="Delivered"){
        order.paymentStatus='Successful'
      }
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
  const loadPdf = async (req, res) => {
    try {
    
        const salesData = await Order.find({ 
            status: { $in: ["Delivered", "Returned"] }
        });


        const doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });

      
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

     
        doc.pipe(res);

       
        const totalSales = salesData.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalOrders = salesData.length;
        const avgSale = totalOrders > 0 ? totalSales / totalOrders : 0;

   
        const formatCurrency = (amount) => `${amount.toFixed(2)}`;

      
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('Sales Report', {
               align: 'center'
           });

        doc.fontSize(12)
           .font('Helvetica')
           .text(new Date().toLocaleDateString('en-US', {
               year: 'numeric',
               month: 'long',
               day: 'numeric'
           }), {
               align: 'center'
           });

        doc.moveDown(2);

       
        const summaryBox = {
            x: 50,
            y: doc.y,
            width: doc.page.width - 100,
            height: 100,
            padding: 10
        };

      
        doc.rect(summaryBox.x, summaryBox.y, summaryBox.width, summaryBox.height)
           .fill('#f5f5f5');

       
        doc.fill('#000000')
           .font('Helvetica-Bold')
           .text('Summary', summaryBox.x + summaryBox.padding, summaryBox.y + summaryBox.padding)
           .font('Helvetica')
           .moveDown(0.5)
           .text(`Total Sales: ${formatCurrency(totalSales)}`)
           .text(`Total Orders: ${totalOrders}`)
           .text(`Average Sale: ${formatCurrency(avgSale)}`);

        doc.moveDown(2);

        const headers = ['Date', 'Order ID', 'Status', 'Items', 'Amount'];
        const columnWidths = {
            date: 80,
            orderId: 100,
            status: 80,
            items: 150,
            amount: 80
        };

        let startX = 50;
        let startY = doc.y;

   
        doc.rect(startX, startY, doc.page.width - 100, 20)
           .fill('#4CAF50');

        doc.fillColor('#FFFFFF');
        let currentX = startX + 5;
        headers.forEach((header, i) => {
            doc.text(
                header,
                currentX,
                startY + 5,
                { width: Object.values(columnWidths)[i], align: 'left' }
            );
            currentX += Object.values(columnWidths)[i];
        });

   
        doc.fillColor('#000000');


        startY += 20;
        salesData.forEach((order, index) => {
            
            if (startY + 20 > doc.page.height - 50) {
                doc.addPage();
                startY = 50;
            }

            if (index % 2 === 0) {
                doc.rect(startX, startY, doc.page.width - 100, 20)
                   .fill('#f2f2f2');
            }

            const orderDate = new Date(order.createdAt).toLocaleDateString();
            
   
            const itemsSummary = order.items
                .map(item => `${item.quantity}x ${item.netTotal}`)
                .join(', ');

         
            currentX = startX + 5;
            doc.fillColor('#000000')
               .text(orderDate, currentX, startY + 5, 
                    { width: columnWidths.date, align: 'left' });
            
            currentX += columnWidths.date;
            doc.text(order._id.toString().slice(-8), currentX, startY + 5, 
                    { width: columnWidths.orderId, align: 'left' });
            
            currentX += columnWidths.orderId;
            doc.text(order.status, currentX, startY + 5, 
                    { width: columnWidths.status, align: 'left' });
            
            currentX += columnWidths.status;
            doc.text(itemsSummary, currentX, startY + 5, 
                    { width: columnWidths.items, align: 'left' });
            
            currentX += columnWidths.items;
            doc.text(formatCurrency(order.totalAmount), currentX, startY + 5, 
                    { width: columnWidths.amount, align: 'right' });

            startY += 20;
        });

        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.text(
                `Page ${i + 1} of ${pages.count}`,
                0,
                doc.page.height - 50,
                { align: 'center' }
            );
        }

        doc.end();

    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate PDF report' 
        });
    }
}; 

  
  module.exports={
    orderList,
    orderDetails,
    updateOrderStatus,
    loadExcel ,
    loadReport,
    loadPdf
  }