const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { category } = require("./categoryController");
const { error } = require("console");
const { isArgumentsObject } = require("util/types");





const getProductAddPage = async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login'); 
}
  try {
    const category = await Category.find({ isListed: true });
    res.render("product-add", {cat: category,});
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const addProducts = async (req, res) => {
  try {
    const products = req.body;
 console.log('req.body:', products);
 
    const images = [];

    
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const originalImagePath = req.files[i].path;

        const resizedImagepath = path.join(
          "public",
          "uploads",
          "product-images",
          `${Date.now()}-${req.files[i].filename}`
        );

        await sharp(originalImagePath)
          .resize({ width: 440, height: 440 })
          .toFile(resizedImagepath);
        images.push(path.basename(resizedImagepath));
      }
    }


    const categoryName = (products.category|| "").trim();
    if (!categoryName) {
      return res.status(400).json({ error: "Category is required." });
    }
    const category = await Category.findOne({
      name: categoryName,
      isListed: true,
    });
    if (!category) {
      return res.status(400).json({ error: "Invalid category name" });
    }

    const sizes = [];
    if (products.M) sizes.push({ sizeName: "M", quantity: parseInt(products.M, 10) || 0 });
    if (products.L) sizes.push({ sizeName: "L", quantity: parseInt(products.L, 10) || 0 });
    if (products.XL) sizes.push({ sizeName: "XL", quantity: parseInt(products.XL, 10) || 0 });

    const totalQuantity = sizes.reduce((sum, size) => sum + size.quantity, 0);
    if (totalQuantity === 0) {
      return res
        .status(400)
        .json({ error: "At least one size must have a positive quantity." });
    }
    

    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      brand: products.brand,
      category: category._id,
      regularPrice: products.regularPrice,
      createdAt: new Date(),
      color: products.color,
      productImage: images,
      status: "Available",
      size: sizes,
      productOffer:products.regularPrice-products.salePrice,
      categoryOffer:(products.regularPrice*category.categoryOffer)/100,
      salePrice: products.regularPrice - Math.max(
        (products.regularPrice - products.salePrice), 
        (products.regularPrice * category.categoryOffer) / 100 
      ),

    });

    await newProduct.save();

    return res.redirect("/admin/products");
  } catch (error) {
    console.error("error saving product", error);
    return res.redirect("/admin/pageerror");
  }
};


const getAllProducts = async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login'); 
}
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;
    const productData = await Product.find({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")
      .exec();

   

    const count = await Product.find({
      $or: [{ productName: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    }).countDocuments();

    const category = await Category.find({ isListed: true });

    if (category) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const getEditProduct = async (req, res) => {
  if (!req.session.admin) {
    return res.redirect('/admin/login'); 
}
  try {
    const id = req.query.id;
    const product = await Product.findOne({_id:id})
    const categories = await Category.find({isListed: true});

    res.render("edit-product", {
      product: product,
      cat: categories,
     
    });
  } catch (error) {
    res.redirect("/admin/pageerror");
  }
};

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;

    const product = await Product.findOne({ _id: id });
    const data = req.body;

    const images = [];
    
    const category = await Category.findById(product.category); // Fetch category
    if (!category) {
      throw new Error("Category not found");
    }
 
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        images.push(req.files[i].filename);
      }
    }

    
    const existingImages = Array.isArray(data.existingImages)
      ? data.existingImages
      : data.existingImages
      ? [data.existingImages]
      : [];

  
    const updatedImages = [...existingImages, ...images];

    const sizes = [];
    if (data.M) sizes.push({ sizeName: "M", quantity: parseInt(data.M, 10) || 0 });
    if (data.L) sizes.push({ sizeName: "L", quantity: parseInt(data.L, 10) || 0 });
    if (data.XL) sizes.push({ sizeName: "XL", quantity: parseInt(data.XL, 10) || 0 });

    const totalQuantity = sizes.reduce((sum, size) => sum + size.quantity, 0);
    if (totalQuantity === 0) {
      return res
        .status(400)
        .json({ error: "At least one size must have a positive quantity." });
    }
    
    
    
    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: product.category, 
      regularPrice: data.regularPrice,
      quantity: data.quantity,
      color: data.color,
      productImage: updatedImages, 
      size: sizes,
      productOffer:data.regularPrice-data.salePrice,
      categoryOffer:(data.regularPrice*category.categoryOffer)/100,
      salePrice: data.regularPrice - Math.max(
        (data.regularPrice - data.salePrice), 
        (data.regularPrice * category.categoryOffer) / 100 
      ),

    };

 
    await Product.findByIdAndUpdate(id, updateFields, { new: true });

    console.log('Product updated successfully:', updateFields);

  
    res.redirect("/admin/products");
  } catch (error) {
    console.error('Error updating product:', error); 
    return res.redirect("/admin/pageerror");
  }
};



const deleteSingleImage = async (req, res) => {
  const { productId, imageName } = req.params;
    try {

        await Product.findByIdAndUpdate(productId, {
            $pull: { productImage: imageName }
        });

       
        const fs = require('fs');
        const imagePath = `./public/uploads/product-images/${imageName}`;
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        res.status(200).send({ message: 'Image deleted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'Failed to delete the image.' });
    }
};



module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
  
};
