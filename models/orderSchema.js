const mongoose=require('mongoose')
const {Schema}=mongoose
const {v4:uuidv4}=require('uuid')
const Address = require('./addressSchema')
const { request } = require('express')


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
        quantity: {
            type: Number, 
            default: 1
          },
          size: {
            type: Map,
            of: Number, 
            required: true
          },
        price:{
            type:String,
            required:true
        },
        total:{
            type:String,
            required:true
        },
        image:{
            type:[String],
            required:true
        }
    }],

    discount:{
        type:Number,
        default:0,
    },
    address:{
        addressType:{
            type:String,
            required:true
        },
        name:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true
        },
        landmark:{
            type:String,
            required:true
        },
        state:{
            type:String,
            required:true
        },
        pincode:{
            type:String,
            required:true
        },
        phone:{
            type:String,
            required:true
        },
        altphone:{
            type:String,
            required:true
        }
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
    },
    paymentMethod:{
        type:String,
        required:true
    }
})

const Order=mongoose.model('Order',orderSchema)
module.exports=Order