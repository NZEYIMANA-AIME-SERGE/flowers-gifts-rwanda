
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
const StoreSetting = require("./models/store-setting");
const Order = require("./models/order");

const ORIGINAL_BUNDLE_NAMES = [
    "Birthday Surprise",
    "Romantic Surprise",
    "Luxury Gift Box"
];

async function rememberDeletedOriginalBundle(name) {
    if (!ORIGINAL_BUNDLE_NAMES.includes(name)) return;
    await StoreSetting.findOneAndUpdate(
        { key: "deleted-original-bundles" },
        { $addToSet: { values: name } },
        { upsert: true, new: true }
    );
}

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
        const [products, bundleSetting] = await Promise.all([
            Product.find(),
            StoreSetting.findOne({ key: "deleted-original-bundles" })
        ]);

        res.json({
            success: true,
            products,
            deletedOriginalBundles: bundleSetting?.values || []
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
    upload.any(),
    async (req, res) => {
        try {
            const {
                name,
                description,
                price,
                category,
                stock,
                available,
                occasion,
                variationType,
                variations: variationsJson
            } = req.body;

            // 1. Validate required fields
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

            const productPrice =
                typeof price === "string" ? price.trim() : "";

            const parsedStock =
                stock !== undefined && String(stock).trim() !== ""
                    ? Number(stock)
                    : 0;

            if (!Number.isInteger(parsedStock) || parsedStock < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Stock must be a non-negative whole number."
                });
            }

            // 2. Validate variation data
            const type = variationType || "none";
            const allowedTypes = [
                "none",
                "color",
                "size",
                "arrangement"
            ];

            if (!allowedTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product variation type."
                });
            }

            let variationDefinitions = [];

            if (variationsJson) {
                try {
                    variationDefinitions = JSON.parse(variationsJson);
                } catch {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid variation data."
                    });
                }
            }

            if (!Array.isArray(variationDefinitions)) {
                return res.status(400).json({
                    success: false,
                    message: "Variations must be a list."
                });
            }

            if (type === "none" && variationDefinitions.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "A product without variations cannot contain variation options."
                });
            }

            if (type !== "none" && variationDefinitions.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Add at least one product variation."
                });
            }

            const files = req.files || [];

            // Check all uploaded file types and variation photos.
            const mainFiles = files.filter(
                file => file.fieldname === "images" ||
                        file.fieldname === "image"
            );

            if (type === "none" && mainFiles.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Please upload at least one product photo."
                });
            }

            const usedFieldNames = new Set();

            for (const variation of variationDefinitions) {
                if (
                    !variation ||
                    typeof variation.name !== "string" ||
                    !variation.name.trim() ||
                    typeof variation.fieldName !== "string" ||
                    !/^variationImages_\d+$/.test(variation.fieldName) ||
                    usedFieldNames.has(variation.fieldName)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Each variation needs a valid name and photo field."
                    });
                }

                usedFieldNames.add(variation.fieldName);

                const variationFiles = files.filter(
                    file => file.fieldname === variation.fieldName
                );

                if (variationFiles.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Upload at least one photo for "${variation.name}".`
                    });
                }
            }

            // Reject files that do not belong to a recognised field.
            const allowedFileFields = new Set([
                "image",
                "images",
                ...variationDefinitions.map(v => v.fieldName)
            ]);

            if (files.some(file => !allowedFileFields.has(file.fieldname))) {
                return res.status(400).json({
                    success: false,
                    message: "An uploaded photo has an unexpected field name."
                });
            }

            // 3. Helper to upload a photo to Cloudinary
            async function uploadPhoto(file) {
                const result = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: "flowers-gifts-rwanda",
                            resource_type: "image"
                        },
                        (error, uploadResult) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(uploadResult);
                            }
                        }
                    );

                    stream.end(file.buffer);
                });

                return result.secure_url;
            }

            // 4. Upload ordinary product photos
            const imageUrls = [];

            for (const file of mainFiles) {
                imageUrls.push(await uploadPhoto(file));
            }

            // Keep the first image in the legacy image field
            // so existing product cards can continue to work.
            const imageUrl = imageUrls[0] || "";

            // 5. Upload photos for each variation separately
            const savedVariations = [];

            for (const variation of variationDefinitions) {
                const variationFiles = files.filter(
                    file => file.fieldname === variation.fieldName
                );

                const variationImageUrls = [];

                for (const file of variationFiles) {
                    variationImageUrls.push(await uploadPhoto(file));
                }

                savedVariations.push({
                    name: variation.name.trim(),
                    images: variationImageUrls
                });
            }

            // 6. Create the product
            const product = new Product({
                name: name.trim(),
                description: description || "",
                occasion: occasion || "",
                price: productPrice,
                category: category.trim(),
                image: imageUrl || savedVariations[0]?.images?.[0] || "",
                images: imageUrls,
                variationType: type,
                variations: savedVariations,
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
        const [products, bundleSetting] = await Promise.all([
            Product.find().sort({ createdAt: -1 }),
            StoreSetting.findOne({ key: "deleted-original-bundles" })
        ]);

        res.json({
            success: true,
            products,
            deletedOriginalBundles: bundleSetting?.values || []
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
    upload.any(),
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
                available,
                variationType,
                variations: variationsJson
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
                    message: "Product not found."
                });
            }

            // Update ordinary product information
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
                const cleanedPrice = String(price).trim();

                if (
                    cleanedPrice !== "" &&
                    cleanedPrice.toLowerCase() !== "null"
                ) {
                    const parsedPrice = Number(cleanedPrice);

                    if (
                        !Number.isFinite(parsedPrice) ||
                        parsedPrice < 0
                    ) {
                        return res.status(400).json({
                            success: false,
                            message: "Price must be a non-negative number, or left blank."
                        });
                    }

                    product.price = cleanedPrice;
                } else {
                    product.price = "";
                }
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

            const files = req.files || [];

            const mainFiles = files.filter(
                file =>
                    file.fieldname === "images" ||
                    file.fieldname === "image"
            );

            const allowedTypes = [
                "none",
                "color",
                "size",
                "arrangement"
            ];

            const type = variationType || product.variationType || "none";

            if (!allowedTypes.includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product variation type."
                });
            }

            // Parse variation definitions, if supplied
            let variationDefinitions = null;

            if (variationsJson !== undefined) {
                try {
                    variationDefinitions = JSON.parse(variationsJson);
                } catch {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid variation data."
                    });
                }

                if (!Array.isArray(variationDefinitions)) {
                    return res.status(400).json({
                        success: false,
                        message: "Variations must be a list."
                    });
                }
            }

            // Upload a photo to the existing Cloudinary folder
            async function uploadPhoto(file) {
                return await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: "flowers-gifts-rwanda",
                            resource_type: "image"
                        },
                        (error, result) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result.secure_url);
                            }
                        }
                    );

                    stream.end(file.buffer);
                });
            }

            // Update main storefront photos without replacing variation data.
            if (mainFiles.length > 0) {
                const imageUrls = [];

                for (const file of mainFiles) {
                    imageUrls.push(await uploadPhoto(file));
                }

                product.images = imageUrls;
                product.image = imageUrls[0] || "";
            }

            if (type === "none") {
                product.variationType = "none";
                product.variations = [];
            }

            // Update variations only when valid variation data and new
            // variation photos have actually been supplied.
            if (
                type !== "none" &&
                variationDefinitions !== null
            ) {
                if (variationDefinitions.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Add at least one product variation."
                    });
                }

                const usedFields = new Set();
                const savedVariations = [];

                for (const variation of variationDefinitions) {
                    const hasFieldName =
                        variation && variation.fieldName !== undefined;

                    if (
                        !variation ||
                        typeof variation.name !== "string" ||
                        !variation.name.trim() ||
                        (hasFieldName &&
                            (typeof variation.fieldName !== "string" ||
                                !/^variationImages_\d+$/.test(variation.fieldName) ||
                                usedFields.has(variation.fieldName)))
                    ) {
                        return res.status(400).json({
                            success: false,
                            message: "Each variation needs a valid name and photo field."
                        });
                    }

                    if (hasFieldName) {
                        usedFields.add(variation.fieldName);
                    }

                    const variationFiles = hasFieldName
                        ? files.filter(file => file.fieldname === variation.fieldName)
                        : [];

                    const imageUrls = [];

                    for (const file of variationFiles) {
                        imageUrls.push(await uploadPhoto(file));
                    }

                    if (imageUrls.length === 0) {
                        const originalName =
                            typeof variation.previousName === "string" &&
                            variation.previousName.trim()
                                ? variation.previousName.trim()
                                : variation.name.trim();
                        const existingVariation = product.variations.find(
                            savedVariation => savedVariation.name === originalName
                        );

                        if (Array.isArray(existingVariation?.images)) {
                            imageUrls.push(...existingVariation.images);
                        }
                    }

                    if (imageUrls.length === 0) {
                        return res.status(400).json({
                            success: false,
                            message: `Upload at least one photo for "${variation.name}".`
                        });
                    }

                    savedVariations.push({
                        name: variation.name.trim(),
                        images: imageUrls
                    });
                }

                const allowedFields = new Set([
                    "image",
                    "images",
                    ...usedFields
                ]);

                if (
                    files.some(file => !allowedFields.has(file.fieldname))
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "An uploaded photo has an unexpected field name."
                    });
                }

                product.variationType = type;
                product.variations = savedVariations;

                // Use a variation photo as the fallback only when there is
                // no separate main storefront photo.
                const firstVariationImage =
                    savedVariations[0]?.images?.[0] || "";

                product.image = product.image || firstVariationImage;
            }

            // Switching explicitly to "no variations" is allowed when
            // new regular product photos are uploaded.
            // Otherwise, keep existing variation data intact.

            const updatedProduct = await product.save();

            return res.json({
                success: true,
                message: "Product updated successfully.",
                product: updatedProduct
            });
        } catch (error) {
            console.error("Failed to update product:", error);

            return res.status(400).json({
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

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (product.category === "gift-bundles") {
            await rememberDeletedOriginalBundle(product.name);
        }

        const deletedProduct = await Product.findByIdAndDelete(id);

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

app.delete("/api/admin/products/legacy-bundle/:name", async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.name);
        if (!ORIGINAL_BUNDLE_NAMES.includes(name)) {
            return res.status(400).json({ success: false, message: "Unknown original bundle." });
        }

        await rememberDeletedOriginalBundle(name);
        res.json({ success: true, message: "Gift bundle deleted successfully." });
    } catch (error) {
        console.error("Failed to delete original gift bundle:", error);
        res.status(500).json({ success: false, message: "Failed to delete gift bundle." });
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
