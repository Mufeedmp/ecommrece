const mongoose=require('mongoose')
const {Schema}=mongoose

const productSchema=new Schema({
    productName:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
    },
    quantity: {
        type: Number,
        default: 1,
        required: true,
        },
    regularPrice:{
        type:Number,
        required:true
    },
    salePrice:{
        type:Number,
        required:true
    },
    productOffer:{
        type:Number,
        default:0
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    color:{
        type:String,
        required:true
    },
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","Out Of Stock"],
        required:true,
        default:"Available"
    },

    size: [
        {
            sizeName: { type: String, required: true },
            quantity: { type: Number, required: true, min: 0, default: 0 },
        },
    ]


   
},{timestamps:true})


const Product=mongoose.model('Product',productSchema)
module.exports=Product