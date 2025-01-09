const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');


const loadAddress=async (req,res) => {
    try {
        
         const userId = req.session.user
         console.log("userId from session:", userId);
        if (!userId) {
            return res.redirect('/profile');  
          }
          const userData=await User.findOne({_id:req.session.user}) 
        const addresses = await Address.find({ userId }); 
        console.log('addresses:',addresses); 
      
        res.render('address', { addresses ,user:userData })
    } catch (error) {
        console.error('Error loading addresses:', error);
        res.redirect('/pageNotFound');
    }
   }

   const loadAddAddress = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/login'); 
        }

        const userData = await User.findOne({ _id: req.session.user });

        res.render('add-address', { user: userData });
    } catch (error) {
        console.error('Error loading add address page:', error);
        res.status(500).send('Internal Server Error');
    }
};

   const addAddress = async (req, res) => {
    try {
      if (!req.user || !req.user._id) {
        throw new Error('User ID is missing');
      }
  
      const address = req.body;
      const userId = req.user._id;
  
      let addressDocument = await Address.findOne({ userId });
  
      if (addressDocument) {
        addressDocument.address.push({
          addressType: address.addressType,
          name: address.name,
          city: address.city,
          landmark: address.landmark,
          state: address.state,
          pincode: String(address.pincode),
          phone: address.phone,
          altphone: address.altphone
        });
        await addressDocument.save();
      } else {
        const newAddress = new Address({
          userId: userId,
          address: [
            {
              addressType: address.addressType,
              name: address.name,
              city: address.city,
              landmark: address.landmark,
              state: address.state,
              pincode: String(address.pincode),
              phone: address.phone,
              altphone: address.altphone
            }
          ]
        });
        await newAddress.save();
      }
  
      return res.redirect('/address');
    } catch (error) {
      console.error('Error creating address:', error);
      return res.redirect('/pageNotFound');
    }
  };
  
   const loadEditAddress=async (req,res) => {
    const addressId=req.params.id
    
    try {
        const userData=await User.findOne({_id:req.session.user})
        const parentDocument = await Address.findOne({
            "address._id": addressId 
        });
        const address = parentDocument.address.find(addr => addr._id.toString() === addressId);
        console.log('address',address);
        
        if (!address) {
            return res.status(404).send('Address not found.');
        }

        res.render('edit-address',{address,user:userData})
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
   }
   
   const editAddress=async (req,res) => {

    const addressId=req.query.id
    const updatedData=req.body


    try {
        const result=await Address.updateOne(
            {'address._id':addressId },
            {
                $set:{
                    'address.$.addressType':updatedData.addressType,
                    "address.$.name": updatedData.name,
                    "address.$.city": updatedData.city,
                    "address.$.landmark": updatedData.landmark,
                    "address.$.state": updatedData.state,
                    "address.$.pincode": updatedData.pincode,
                    "address.$.phone": updatedData.phone,
                    "address.$.altphone": updatedData.altphone,
                }
            }
        )

        console.log('Address updated successfully:', result);
        res.redirect('/address'); 
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
   }

   const deleteAddress=async (req,res) => {
    const addressId=req.params.id
    const userId = req.user.id;
    console.log('Address ID:', addressId); 
    console.log('User ID:', userId); 
    try {
        const result = await Address.updateOne(
            { userId: userId},{$pull:{address:{_id: addressId }}}
        );
        console.log('Address deleted successfully:', result);
        res.redirect('/address')
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).send('Internal Server Error');
    }
   }

   module.exports = {
    loadAddress,
    loadAddAddress,
    loadEditAddress,
    addAddress,
    editAddress,
    deleteAddress,
   
};