const express = require('express')
const path = require('path')
const dotenv = require('dotenv')
const session=require('express-session')
const passport=require('./config/passport')
const userRouter = require('./routes/userRouter')
const adminRouter = require('./routes/adminRouter')
const MongoStore = require('connect-mongo');
const db = require('./config/db')
const errorMiddleware = require('./middlewares/errorMiddleware');

const nocache=require('nocache')

dotenv.config()
 
const app = express()

db()

const mongoUrl = process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(nocache());  


app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,  
    saveUninitialized:true,
    cookie:{
        secure:false, 
        httpOnly:true,
        maxAge:72*60*60*1000 
    }
}))

app.use(passport.initialize())
app.use(passport.session())




app.set('view engine','ejs')
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,'public')))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



app.use('/',userRouter)
app.use('/admin',adminRouter)


app.use((req, res, next) => {
    res.status(404).render('page-404');
});

app.use(errorMiddleware);


const PORT= 3000 || process.env.PORT
app.listen(PORT, ()=>{
console.log('Server Running http://localhost:3000')

}) 


module.exports = app;
