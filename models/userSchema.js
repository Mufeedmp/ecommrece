const mongoose=require('mongoose')

const {Schema}=mongoose


const userSchema=new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    phone:{
        type:String,
        required:false,
        unique:false,
        sparse:true, 
        default:null
    },
    googleId:{
        type:String,
        unique:true
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    authMethod: {
        type: String,
        default: 'local'
    }, 
    isAdmin:{
        type:Boolean,
        default:false
    },
    createdOn:{
        type:Date,
        default:Date.now
    },
    referralCode: {
        type: String,
        unique: true
    },
    referredBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    referralCount: {
        type: Number,
        default: 0
    },
  

})

userSchema.pre('save', async function (next) {
    if (!this.referralCode) {
        const namePrefix = this.name ? this.name.substring(0, 4).toUpperCase() : "USER";
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.referralCode = namePrefix + randomPart;
    }
    next();
});



const User=mongoose.model('User',userSchema)
module.exports=User




 // cart:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"Cart"
    // }],
    // wishlist:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"Wishlist"
    // }],
    // wallet:{
    //     type:Number,
    //     default:0
    // },
    // 
   
    // redeemedUsers:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"User"
    // }],
    // searchHistory:[{
    //     category:{
    //         type:Schema.Types.ObjectId,
    //         ref:"Category"
    //     },
    //     brand:{
    //         type:String
    //     },
    //     searchOn:{
    //         type:Date,
    //         default:Date.now
    //     }
    // }]
