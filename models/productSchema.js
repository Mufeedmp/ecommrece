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
    brand:{
        type:String,
        required:false
    },

    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
        },
    regularPrice:{
        type:Number,
        required:true
    },
    size:{
        type:String,
        required:false
    },
    salePrice:{
        type:Number,
        required:true
    },
    productOffer:{
        type:Number,
        default:0
    },
    quantity:{
        type:Number,
        required:true
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
    variants: [
        {
          
              size: {
                type: String,
                required: true,
                enum: [ 'M', 'L', 'XL', 'XXL'], 
              },
              stock: {
                type: Number,
                required: true,
                min: 0,
              },
        }
      ],
},{timestamps:true})


const Product=mongoose.model('Product',productSchema)
module.exports=Product