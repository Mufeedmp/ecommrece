const mongoose=require('mongoose')
const {Schema}=mongoose
const {v4:uuidv4}=require('uuid')
const Address = require('./addressSchema')


const orderSchema=new Schema({

    orderId:{
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    orderDate:{
        type:Date,
        default:Date.now
    },
    status:{
        type:String,
        default:'pending'
    },
    paymentStatus: {
        type: String, 
        default: "Pending"
    },
    totalAmount: { 
        type: Number,
        required: true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        name:{
            type:String,
            required:true
        },
        quantity:{
            type:Number,
            default:1
        },
        price:{
            type:Number,
            required:true
        },
        total:{
            type:Number,
            required:true
        }
    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0,
    },
    finalAmount:{
        type:Number,
        required:true
    },
    address:{
        type:String,
        ref:'User',
        required:true
    },
    invoiceDate:{
        type:Date,
    },
    status: { 
        type: String, 
        enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"], 
        default: "Pending" 
      }, 
    paymentStatus: { 
        type: String, 
        enum: ["Paid", "Pending", "Failed", "Refunded"], 
        default: "Pending" 
      },
    createdAt: {
         type: Date, 
         default: Date.now 
        }, 
    updatedAt: { 
        type: Date, 
        default: Date.now 
    },
    couponApplied:{
        type:Boolean,
        default:false
    }
})

const Order=mongoose.model('Order',orderSchema)
module.exports=Order