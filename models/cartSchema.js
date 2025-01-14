const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      size: {
         type: String, 
         required: true
      },
    
      productName: {
        type: String,
        required: true,
      },
      productImage: {
        type: [String],
        required: true,
      },
      salePrice: {
        type: Number,
        required: true,
      },
      regularPrice: {
        type: Number,
        required: true,
      },
      isBlocked: {
        type: Boolean,
        default: false,
      },
      totalPrice: {
        type: Number,
        required: false,
      },
      categoryOffer:{
        type:Number,
        default:0
      },
      productOffer:{
      type:Number,
      default:0
     }
     
    },
  ],
   cartSubtotal: {
        type: Number,
        required: false,
      },
      cartTotal: {
        type: Number,
        required: false,
      },
      totalOffer:{
        type:Number,
      default:0
      }
});


const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
