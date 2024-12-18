const Category = require('../../models/categorySchema')
const fs = require('fs');
const path = require('path');








const category=async (req,res) => {
    try {
        const page=parseInt(req.query.page)||1
        const limit=4
        const skip=(page-1)*limit

        const categoryData=await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalCategories=await Category.countDocuments()
        const totalPages=Math.ceil(totalCategories/limit)
        res.render('category',{
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategories:totalCategories
            })

    } catch (error) {
        console.error(error)
        res.redirect('/pageerror')
        
    }
}

const addCategory=async (req,res) => {
    const {name,description}=req.body
    try {
        const existingCategory=await Category.findOne({name})
        if(existingCategory){
            return res.status(400).json({error:"category already exist"})
        }

        const imagePath=`/uploads/cat-images/${req.file.filename}`

        const newCategory=new Category({
            name,
            description,
            imagePath
        })
        await newCategory.save()
        return res.json({message:"category added successfully"})
    } catch (error) {
        console.error('Error adding category:', error);
         return res.status(500).json({error:"internal server error"})
    }
}

const listCategory=async (req,res) => {
    try {
        let id=req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:true}})
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageerror')
    }
}


const unlistCategory=async (req,res) => {
    try {
        let id=req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:false}})
        res.redirect('/admin/category')
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const getEditCategory=async (req,res) => {
    try {
        const id=req.query.id
        const category=await Category.findOne({_id:id})
        res.render('edit-category',{category:category})
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const editCategory=async (req,res) => {
    try {
        const id=req.params.id
        const {categoryname,description}=req.body
       const existingCategory=await Category.findOne({
        name:categoryname,
        _id:{$ne:id}
        })
      if(existingCategory){
        return res.status(400).json({error:'category exists,please choose another name'})
      }

      const currentCategory = await Category.findById(id);
      if (!currentCategory) {
          return res.status(404).json({ error: 'Category not found' });
      }

      let imagePath = currentCategory.imagePath;

      if(req.file&& req.file.filename){
        imagePath = `/uploads/cat-images/${req.file.filename}`;

        if (currentCategory.imagePath) {
        const oldImagePath=path.join(__dirname,'..','public',currentCategory.imagePath.replace('/uploads',''))
        if(fs.existsSync(oldImagePath)){
            fs.unlinkSync(oldImagePath)
        }
    }
} 
      const updateCategory=await Category.findByIdAndUpdate(id,{
        name:categoryname,
        description,
        imagePath
    },
        {new:true})

      if(updateCategory){
        res.redirect('/admin/category')
      }else{
        res.status(404).json({error:'category not found'})
      }
    } catch (error) {
        res.status(500).json({error:'internal server error'})
        
    }
}

module.exports={
    category,
    addCategory,
    listCategory,
    unlistCategory,
    getEditCategory,
    editCategory
}