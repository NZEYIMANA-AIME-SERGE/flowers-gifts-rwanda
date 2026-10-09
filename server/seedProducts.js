const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("./models/product");

const products = [
    {
        name: "Classic Red Roses",
        category: "Flowers",
        price: 25000,
        emoji: "🌹",
        description: "A beautiful bouquet of classic red roses.",
        stock: 20,
        available: true
    },

    {
        name: "Mixed Flower Bouquet",
        category: "Flowers",
        price: 30000,
        emoji: "💐",
        description: "A colorful arrangement of mixed flowers.",
        stock: 20,
        available: true
    },

    {
        name: "Premium Chocolate Box",
        category: "Chocolates",
        price: 18000,
        emoji: "🍫",
        description: "A premium chocolate gift box.",
        stock: 20,
        available: true
    },

    {
        name: "Elegant Perfume",
        category: "Perfumes",
        price: 35000,
        emoji: "🌸",
        description: "A stylish perfume gift.",
        stock: 20,
        available: true
    },

    {
        name: "Classic Fashion Shoes",
        category: "Fashion",
        price: 45000,
        emoji: "👟",
        description: "Comfortable and stylish shoes.",
        stock: 20,
        available: true
    },

    {
        name: "Celebration Cake",
        category: "Cakes",
        price: 28000,
        emoji: "🎂",
        description: "A cake for birthdays and celebrations.",
        stock: 20,
        available: true
    },

    {
        name: "Cute Teddy Bear",
        category: "Teddy Bears",
        price: 22000,
        emoji: "🧸",
        description: "A soft teddy bear gift.",
        stock: 20,
        available: true
    },

    {
        name: "Luxury Gift Basket",
        category: "Gift Baskets",
        price: 55000,
        emoji: "🎁",
        description: "A carefully arranged gift basket.",
        stock: 20,
        available: true
    },

    {
        name: "Gold-Style Bracelet",
        category: "Jewelry",
        price: 32000,
        emoji: "📿",
        description: "A simple and elegant bracelet.",
        stock: 20,
        available: true
    },

    {
        name: "Birthday Gift Set",
        category: "Gift Sets",
        price: 60000,
        emoji: "🎉",
        description: "Flowers, chocolates, and a greeting card.",
        stock: 20,
        available: true
    },

    {
        name: "Romantic Surprise Set",
        category: "Gift Sets",
        price: 75000,
        emoji: "💝",
        description: "Roses, chocolates, and a special message.",
        stock: 20,
        available: true
    },

    {
        name: "Graduation Gift Set",
        category: "Gift Sets",
        price: 50000,
        emoji: "🎓",
        description: "A thoughtful graduation gift.",
        stock: 20,
        available: true
    }
];


async function seedProducts() {

    try {

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected.");


        // Remove existing products
        await Product.deleteMany({});

        console.log("Existing products removed.");


        // Insert all 12 products
        const insertedProducts =
            await Product.insertMany(products);


        console.log(
            `${insertedProducts.length} products inserted successfully.`
        );


        insertedProducts.forEach(product => {

            console.log(
                `${product.name} → ${product._id}`
            );

        });


        await mongoose.disconnect();

        console.log("MongoDB connection closed.");

    } catch (error) {

        console.error("Seeding failed:");
        console.error(error);

        process.exit(1);

    }
}


seedProducts();