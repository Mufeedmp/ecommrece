const mongoose = require('mongoose');
const {Schema}=mongoose

const WalletSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
    required: true,
  },
  transactions: [
    {
      amount: {
        type: Number,
        required: true,
      },
      type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true,
      },
      description: {
        type: String,
      },
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', WalletSchema);

module.exports = Wallet;
