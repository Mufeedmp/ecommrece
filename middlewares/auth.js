const { session } = require('passport');
const User = require('../models/userSchema');
const { Admin } = require('mongodb');


const userAuth = async (req, res, next) => {
    if (req.session.admin) {
        return next(); 
    }
    if (req.session.user) {
        try {
            const user = await User.findById(req.session.user);
            if (user && !user.isBlocked) {
                req.user = user;
                next();
            } else {
               
                req.session.destroy(err => {
                    if (err) {
                        console.error('Error destroying session:', err);
                        return next(err);
                    }
                    return res.redirect('/login?message=blocked');
                });
            }
        } catch (error) {
            console.error('Error fetching user in global middleware:', error);
            return next(error);
        }
    } else {
        next();
    }
};

const adminAuth = async (req, res, next) => {

    try {

        if (!req.session.admin) {
            return res.redirect('/admin/login');
        }

        const adminUser = await User.findOne({
            _id: req.session.admin,
            isAdmin: true
        });

        if (!adminUser) {

            req.session.admin = null;
            return res.redirect('/admin/login');
        }


        req.admin = adminUser;
        next();
    } catch (error) {
        console.error('Error in admin auth middleware:', error);
        res.status(500).send('Internal server error');
    }
};

module.exports = {
    userAuth,
    adminAuth
};