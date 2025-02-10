const Coupon=require('../../models/couponSchema')

const loadCoupon=async (req,res) => {
    try {

      const page=parseInt(req.query.page)||1
        const limit=6
        const skip=(page-1)*limit

      const coupon=await Coupon.find()
      .sort({createdAt:-1})
      .limit(limit)
      .skip(skip)

      const count=await Coupon.find().countDocuments()
      const totalPages=Math.ceil(count/limit)
      res.render('coupon',{
        coupon,
        totalPages:totalPages,
        currentPage: page  
      })

    } catch (error) {
      console.error('Error loading coupons:', error);
   res.status(500).render('error', { message: 'An error occurred while fetching coupons.' });
    
    }
  }
  const loadAddCoupon=async (req,res) => {
    try {
      res.render('addCoupon')
    } catch (error) {
      console.error('Error loading coupons:', error);
   res.status(500).render('error', { message: 'An error occurred while fetching coupons.' });
    
    }
  }

  const createCoupon = async (req, res) => {
    try {
        const { couponCode, discount, minPrice, expiryDate } = req.body;

    
        if (!couponCode || !discount || !minPrice || !expiryDate) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingCoupon = await Coupon.findOne({ name: couponCode });
        
        if (existingCoupon) {
            return res.status(400).json({ message: 'Coupon code already exists' });
        }

      
        const newCoupon = new Coupon({
            name: couponCode,           
            offerPrice: discount,      
            minPrice: minPrice,        
            expireOn: expiryDate,     
            createdOn: new Date(),      
            isList: true,               
     
        });

        await newCoupon.save();
        return res.status(201).json({ message: 'Coupon created successfully' });

    } catch (error) {
        console.error('Coupon creation error:', error);
        return res.status(500).json({ 
            message: 'Internal server error',
            details: error.message
        });
    }
};
  const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.body.couponId; 
 
    const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

    if (!deletedCoupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.redirect('/admin/coupons'); 
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


  module.exports={ 
    loadCoupon,
    createCoupon,
    deleteCoupon,
    loadAddCoupon
  }