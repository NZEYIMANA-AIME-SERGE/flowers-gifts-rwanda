
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const crypto = require("crypto");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, ".env")
});

const Product = require("./models/product");
const Order = require("./models/order");

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// PRICE CONVERSION
// ==========================================

// Numeric prices are used for calculations.
// Blank and descriptive prices count as zero.
function priceToAmount(value) {
    if (value === undefined || value === null) {
        return 0;
    }

    const text = String(value).trim();

    if (!text) {
        return 0;
    }

    const match = text.match(
        /^(?:RWF\s*)?([\d,]+(?:\.\d{1,2})?)\s*(?:RWF)?$/i
    );

    if (!match) {
        return 0;
    }

    const amount = Number(
        match[1].replace(/,/g, "")
    );

    return Number.isFinite(amount) && amount >= 0
        ? amount
        : 0;
}

// ==========================================
// CLOUDINARY CONFIGURATION
// ==========================================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ==========================================
// IMAGE UPLOAD CONFIGURATION
// ==========================================

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed."));
        }
    }
});

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

const ADMIN_TOKEN_LIFETIME = 8 * 60 * 60 * 1000;

function safeCompare(valueA, valueB) {
    const a = Buffer.from(String(valueA));
    const b = Buffer.from(String(valueB));

    return (
        a.length === b.length &&
        crypto.timingSafeEqual(a, b)
    );
}

function createAdminToken(username) {
    const payload = Buffer.from(
        JSON.stringify({
            username,
            expiresAt: Date.now() + ADMIN_TOKEN_LIFETIME
        })
    ).toString("base64url");

    const signature = crypto
        .createHmac(
            "sha256",
            process.env.ADMIN_TOKEN_SECRET
        )
        .update(payload)
        .digest("base64url");

    return `${payload}.${signature}`;
}

function requireAdmin(req, res, next) {
    try {
        const secret = process.env.ADMIN_TOKEN_SECRET;

        if (!secret) {
            return res.status(503).json({
                success: false,
                message: "Admin authentication is not configured."
            });
        }

        const authorization =
            req.headers.authorization || "";

        const [scheme, token] = authorization.split(" ");

        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({
                success: false,
                message: "Please log in as admin."
            });
        }

        const parts = token.split(".");

        if (parts.length !== 2) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin session."
            });
        }

        const [payload, suppliedSignature] = parts;

        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(payload)
            .digest("base64url");

        if (
            !safeCompare(
                suppliedSignature,
                expectedSignature
            )
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin session."
            });
        }

        const session = JSON.parse(
            Buffer.from(payload, "base64url").toString("utf8")
        );

        if (
            session.username !== process.env.ADMIN_USERNAME ||
            !Number.isFinite(session.expiresAt) ||
            session.expiresAt <= Date.now()
        ) {
            return res.status(401).json({
                success: false,
                message: "Admin session expired. Please log in again."
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid admin session."
        });
    }
}

// Public admin login endpoint
app.post("/api/auth/admin/login", (req, res) => {
    const { username, password } = req.body || {};

    const expectedUsername = process.env.ADMIN_USERNAME;
    const expectedPassword = process.env.ADMIN_PASSWORD;
    const tokenSecret = process.env.ADMIN_TOKEN_SECRET;

    if (
        !expectedUsername ||
        !expectedPassword ||
        !tokenSecret
    ) {
        return res.status(503).json({
            success: false,
            message: "Admin authentication is not configured."
        });
    }

    if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        !safeCompare(username, expectedUsername) ||
        !safeCompare(password, expectedPassword)
    ) {
        return res.status(401).json({
            success: false,
            message: "Incorrect username or password."
        });
    }

    return res.json({
        success: true,
        token: createAdminToken(expectedUsername),
        expiresIn: ADMIN_TOKEN_LIFETIME
    });
});

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
    res.json({
        message: "Flowers & Gifts Rwanda API is running"
    });
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Backend is working"
    });
});

// ==========================================
// PUBLIC PRODUCTS
// ==========================================

app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find();

        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error("Failed to fetch products:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch products"
        });
    }
});

// ==========================================
// PROTECT ADMIN API ROUTES
// ==========================================

app.use("/api/admin", requireAdmin);

// ==========================================
// ADMIN - CREATE PRODUCT
// ==========================================

app.post(
    "/api/admin/products",
    upload.single("image"),
    async (req, res) => {
        try {
            const {
                name,
                description,
                price,
                category,
                stock,
                available,
                occasion
            } = req.body;

            // Validate required product fields
            if (
                typeof name !== "string" ||
                !name.trim() ||
                typeof category !== "string" ||
                !category.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Product name and category are required."
                });
            }

            let imageUrl = "";

            // Upload image to Cloudinary when provided
            if (req.file) {
                const uploadResult = await new Promise(
                    (resolve, reject) => {
                        const uploadStream =
                            cloudinary.uploader.upload_stream(
                                {
                                    folder: "flowers-gifts-rwanda"
                                },
                                (error, result) => {
                                    if (error) {
                                        reject(error);
                                    } else {
                                        resolve(result);
                                    }
                                }
                            );

                        uploadStream.end(req.file.buffer);
                    }
                );

                imageUrl = uploadResult.secure_url;
            }

            // Blank and descriptive prices remain strings.
            const productPrice =
                typeof price === "string"
                    ? price.trim()
                    : "";

            // Accept valid stock values; otherwise default to zero.
            const parsedStock =
                stock !== undefined &&
                String(stock).trim() !== ""
                    ? Number(stock)
                    : 0;

            if (
                !Number.isInteger(parsedStock) ||
                parsedStock < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Stock must be a non-negative whole number."
                });
            }

            const product = new Product({
                name: name.trim(),
                description: description || "",
                occasion: occasion || "",
                price: productPrice,
                category: category.trim(),
                image: imageUrl,
                stock: parsedStock,
                available:
                    available === true ||
                    available === "true"
            });

            const savedProduct = await product.save();

            return res.status(201).json({
                success: true,
                message: "Product created successfully",
                product: savedProduct
            });
        } catch (error) {
            console.error("Failed to create product:", error);

            return res.status(400).json({
                success: false,
                message: "Failed to create product",
                error: error.message
            });
        }
    }
);

// ==========================================
// CREATE ORDER
// ==========================================

app.post("/api/orders", async (req, res) => {
    try {
        const {
            customer,
            recipient,
            delivery,
            giftMessage,
            items
        } = req.body;

        if (!customer?.name || !customer?.phone) {
            return res.status(400).json({
                message: "Customer name and phone are required."
            });
        }

        if (!recipient?.name || !recipient?.phone) {
            return res.status(400).json({
                message: "Recipient name and phone are required."
            });
        }

        if (!delivery?.location || !delivery?.date) {
            return res.status(400).json({
                message: "Delivery location and date are required."
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Your order must contain at least one product."
            });
        }

        const productIds = items.map(item => item.productId);

        const products = await Product.find({
            _id: { $in: productIds }
        });

        const orderItems = [];

        for (const item of items) {
            if (!item.productId) {
                return res.status(400).json({
                    message: "A product ID is missing from the order."
                });
            }

            const product = products.find(
                p => p._id.toString() ===
                    item.productId.toString()
            );

            if (!product) {
                return res.status(400).json({
                    message: "One of the products in your cart no longer exists."
                });
            }

            if (!product.available) {
                return res.status(400).json({
                    message: `${product.name} is currently unavailable.`
                });
            }

            const quantity = Number(item.quantity);

            if (
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {
                return res.status(400).json({
                    message: `Invalid quantity for ${product.name}.`
                });
            }

            if (quantity > product.stock) {
                return res.status(400).json({
                    message: `Only ${product.stock} unit(s) of ${product.name} are currently available.`
                });
            }

            const numericPrice = priceToAmount(product.price);
            const itemTotal = numericPrice * quantity;

            orderItems.push({
                productId: product._id,
                name: product.name,
                price: numericPrice,
                quantity,
                image: product.image || "",
                itemTotal
            });
        }

        const subtotal = orderItems.reduce(
            (sum, item) => sum + item.itemTotal,
            0
        );

        const deliveryFee = 2000;
        const total = subtotal + deliveryFee;

        const order = new Order({
            customer: {
                name: customer.name,
                phone: customer.phone,
                email: customer.email || ""
            },

            recipient: {
                name: recipient.name,
                phone: recipient.phone
            },

            delivery: {
                location: delivery.location,
                date: delivery.date
            },

            giftMessage: giftMessage || "",
            items: orderItems,
            subtotal,
            deliveryFee,
            total,
            paymentMethod: "",
            paymentStatus: "pending",
            orderStatus: "pending"
        });

        const savedOrder = await order.save();

        return res.status(201).json({
            message: "Order created successfully.",
            order: savedOrder
        });
    } catch (error) {
        console.error("Create order error:", error);

        return res.status(500).json({
            message: "Failed to create order.",
            error: error.message
        });
    }
});

// ==========================================
// ADMIN - GET ALL ORDERS
// ==========================================

app.get("/api/admin/orders", async (req, res) => {
    try {
        const orders = await Order
            .find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            orders
        });
    } catch (error) {
        console.error("Failed to fetch admin orders:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message
        });
    }
});

// ==========================================
// ADMIN - DASHBOARD STATISTICS
// ==========================================

app.get("/api/admin/stats", async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();

        const lowStockProducts = await Product.countDocuments({
            stock: { $lte: 5 }
        });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todaySalesResult = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startOfDay },
                    paymentStatus: "paid"
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$total" }
                }
            }
        ]);

        const todaySales =
            todaySalesResult.length > 0
                ? todaySalesResult[0].total
                : 0;

        res.json({
            success: true,
            stats: {
                todaySales,
                totalOrders,
                totalProducts,
                lowStockProducts
            }
        });
    } catch (error) {
        console.error("Failed to fetch admin statistics:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard statistics",
            error: error.message
        });
    }
});

// ==========================================
// ADMIN - UPDATE ORDER STATUS
// ==========================================

app.put("/api/admin/orders/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { orderStatus, paymentStatus } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID."
            });
        }

        const updateData = {};

        if (orderStatus) {
            updateData.orderStatus = orderStatus;
        }

        if (paymentStatus) {
            updateData.paymentStatus = paymentStatus;
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.json({
            success: true,
            message: "Order updated successfully",
            order: updatedOrder
        });
    } catch (error) {
        console.error("Failed to update order:", error);

        res.status(400).json({
            success: false,
            message: "Failed to update order",
            error: error.message
        });
    }
});

// ==========================================
// ADMIN - GET ALL PRODUCTS
// ==========================================

app.get("/api/admin/products", async (req, res) => {
    try {
        const products = await Product
            .find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error("Failed to fetch admin products:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch products",
            error: error.message
        });
    }
});

// ==========================================
// ADMIN - UPDATE PRODUCT
// ==========================================

app.put(
    "/api/admin/products/:id",
    upload.single("image"),
    async (req, res) => {
        try {
            const { id } = req.params;

            const {
                name,
                description,
                price,
                category,
                occasion,
                stock,
                available
            } = req.body;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID."
                });
            }

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            if (name !== undefined) {
                if (!String(name).trim()) {
                    return res.status(400).json({
                        success: false,
                        message: "Product name cannot be empty."
                    });
                }

                product.name = String(name).trim();
            }

            if (description !== undefined) {
                product.description = description;
            }

            if (price !== undefined) {
                product.price = String(price).trim();
            }

            if (category !== undefined) {
                if (!String(category).trim()) {
                    return res.status(400).json({
                        success: false,
                        message: "Product category cannot be empty."
                    });
                }

                product.category = String(category).trim();
            }

            if (occasion !== undefined) {
                product.occasion = occasion;
            }

            if (
                stock !== undefined &&
                String(stock).trim() !== ""
            ) {
                const parsedStock = Number(stock);

                if (
                    !Number.isInteger(parsedStock) ||
                    parsedStock < 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Stock must be a non-negative whole number."
                    });
                }

                product.stock = parsedStock;
            }

            if (available !== undefined) {
                product.available =
                    available === true ||
                    available === "true";
            }

            // Replace the image only when a new one is uploaded.
            if (req.file) {
                const uploadResult = await new Promise(
                    (resolve, reject) => {
                        const uploadStream =
                            cloudinary.uploader.upload_stream(
                                {
                                    folder: "flowers-gifts-rwanda"
                                },
                                (error, result) => {
                                    if (error) {
                                        reject(error);
                                    } else {
                                        resolve(result);
                                    }
                                }
                            );

                        uploadStream.end(req.file.buffer);
                    }
                );

                product.image = uploadResult.secure_url;
            }

            const updatedProduct = await product.save();

            res.json({
                success: true,
                message: "Product updated successfully",
                product: updatedProduct
            });
        } catch (error) {
            console.error("Failed to update product:", error);

            res.status(400).json({
                success: false,
                message: "Failed to update product",
                error: error.message
            });
        }
    }
);

// ==========================================
// ADMIN - DELETE PRODUCT
// ==========================================

app.delete("/api/admin/products/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const deletedProduct =
            await Product.findByIdAndDelete(id);

        if (!deletedProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            message: "Product deleted successfully",
            product: deletedProduct
        });
    } catch (error) {
        console.error("Failed to delete product:", error);

        res.status(400).json({
            success: false,
            message: "Failed to delete product",
            error: error.message
        });
    }
});

// ==========================================
// START SERVER + MONGODB
// ==========================================

async function startServer() {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from environment variables.");
        }

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(
                `Server running on port ${PORT}`
            );
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
}

startServer();
