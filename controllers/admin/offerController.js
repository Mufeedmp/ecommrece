const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { category } = require("./categoryController");
const { error } = require("console");
const { isArgumentsObject } = require("util/types");

const loadOffer=async (req,res) => {
    try {
      res.render('offers')
    } catch (error) {
      
    }
  }


  module.exports={
    loadOffer
  }