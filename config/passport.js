const passport=require('passport')
const GoogleStrategy=require('passport-google-oauth20').Strategy
const User=require('../models/userSchema')
const env=require('dotenv').config()

passport.use(new GoogleStrategy({

   clientID:process.env.GOOGLE_CLIENT_ID,
   clientSecret:process.env.GOOGLE_CLIENT_SECRET,
   callbackURL:'/auth/google/callback'
},
async (accessTocken,refreshTocken,profile,done) => {
    try {
        let user=await User.findOne({googleId:profile.id})
        if(user){
            if (user.isBlocked) {
                return done(null, false, { message: 'Your account is blocked.' });
            }
            return done(null,user)
        } 


        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
            user.googleId = profile.id;
            if (user.isBlocked) {
                return done(null, false, { message: 'Your account is blocked.' });
            }
            await user.save();
            return done(null, user);
        }
        
         const newUser=new User({
                name:profile.displayName,
                email:profile.emails[0]. value,
                googleId:profile.id
            })
            await newUser.save()
            return done(null,newUser)
        
    } catch (error) {
        return done(error)
    }
   }
)
)

passport.serializeUser((user,done)=>{
    done(null,user.id)
})

passport.deserializeUser((id,done)=>{
    User.findById(id)
    .then(user=>{
        done(null,user)
    })
    .catch(err=>{
       return done(err,null)
    })
})

module.exports=passport