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
        default: 1
      },
      size: {
         type: Map,
         of: String, 
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
      isBlocked: {
        type: Boolean,
        default: false,
      },
      totalPrice: {
        type: Number,
        required: false,
      },
     
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
});


const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
