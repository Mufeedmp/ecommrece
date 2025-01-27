const Product = require('../../models/productSchema');
const Order = require('../../models/orderSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');


const getDashboardData = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const availableYears = await getAvailableYears();
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const [totalRevenue, totalOrders, totalProducts, totalUsers, salesData, topProducts] = 
            await Promise.all([
                calculateTotalRevenue(),
                Order.countDocuments(),
                Product.countDocuments(),
                User.countDocuments(),
                getSalesData({ type: 'monthly' }), 
                getTopProducts()
            ]);

 
        const transformedSalesData = months.map((monthName, index) => {
            const monthData = salesData.find(item => item._id === index + 1) || { totalSales: 0 };
            return {
                _id: index + 1,
                totalSales: monthData.totalSales,
                monthName: monthName
            };
        });

        res.render('dashboard', {
            totalRevenue,
            totalOrders,
            totalProducts,
            totalUsers,
            availableYears,
            currentYear,
            months,
            salesData: transformedSalesData,
            topProducts,
        });
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ message: 'Dashboard data error', error });
    }
};


const getAvailableYears = async () => {
    const orders = await Order.aggregate([
        { $group: { _id: { $year: "$orderDate" } } },
        { $sort: { _id: 1 } },
    ]);
    return orders.map(order => order._id);
};


const calculateTotalRevenue = async () => {
    const result = await Order.aggregate([
        { $match: { status: 'Delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    return result[0]?.total || 0;
};


const getSalesData = async (filters = {}) => {
    const { type = 'monthly' } = filters;
    
    let pipeline = [
        {
            $match: {
                status: 'Delivered'  
            }
        }
    ];

    if (type === 'yearly') {
        pipeline.push(
            {
                $group: {
                    _id: { $year: "$orderDate" },
                    totalSales: { $sum: "$totalAmount" }
                }
            },
            { $sort: { _id: 1 } }
        );
    } else {
  
        pipeline.push(
            {
                $group: {
                    _id: { 
                        year: { $year: "$orderDate" },
                        month: { $month: "$orderDate" }
                    },
                    totalSales: { $sum: "$totalAmount" }
                }
            },
            {
                $project: {
                    _id: "$_id.month",  
                    year: "$_id.year",
                    totalSales: 1
                }
            },
            { $sort: { _id: 1 } }
        );
    }

    const salesData = await Order.aggregate(pipeline);
    
    if (type === 'monthly') {
        const filledData = [];
        for (let i = 1; i <= 12; i++) {
            const monthData = salesData.find(item => item._id === i);
            filledData.push({
                _id: i,
                totalSales: monthData ? monthData.totalSales : 0
            });
        }
        return filledData;
    }
    
    return salesData;
};


const getTopProducts = async () => {
    const pipeline = [
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.productId",
                totalQuantitySold: { $sum: "$items.quantity" },
            },
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productInfo",
            },
        },
        { $unwind: "$productInfo" },
        {
            $lookup: {
                from: "categories",
                localField: "productInfo.category",
                foreignField: "_id",
                as: "categoryInfo",
            },
        },
        { $unwind: "$categoryInfo" },
        { $sort: { totalQuantitySold: -1 } },
        { $limit: 10 },
        {
            $project: {
                _id: 1,
                totalQuantitySold: 1,
                productName: "$productInfo.productName",
                description: "$productInfo.description",
                categoryName: "$categoryInfo.name",
                productImage: "$productInfo.productImage",
            },
        },
    ];

    const result = await Order.aggregate(pipeline);
    return result;
};


const getSalesByFilter = async (req, res) => {
    try {
        const { type = 'monthly' } = req.query;
        
        let pipeline = [
            {
                $match: {
                    status: 'Delivered'
                }
            }
        ];

        if (type === 'yearly') {
            pipeline.push(
                {
                    $group: {
                        _id: { $year: "$orderDate" },
                        totalSales: { $sum: "$totalAmount" }
                    }
                },
                { $sort: { _id: 1 } }
            );
        } else {
            pipeline.push(
                {
                    $group: {
                        _id: { $month: "$orderDate" },
                        totalSales: { $sum: "$totalAmount" }
                    }
                },
                { $sort: { _id: 1 } }
            );
        }

        const result = await Order.aggregate(pipeline);
        
        if (type === 'monthly') {
            const filledData = Array.from({ length: 12 }, (_, index) => {
                const monthData = result.find(item => item._id === index + 1);
                return {
                    _id: index + 1,
                    totalSales: monthData ? monthData.totalSales : 0
                };
            });
            return res.json(filledData);
        }
        
        return res.json(result);
    } catch (error) {
        console.error('Sales filter error:', error);
        res.status(500).json({ 
            message: 'Error fetching sales data',
            error: error.message 
        });
    }
};

module.exports = {
    getDashboardData,
    getSalesByFilter,
};
