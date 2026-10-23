
const mongoose = require("mongoose");


const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        // Allows blank prices, numeric prices, and text such as "Negotiable"
        price: {
            type: String,
            default: ""
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        occasion: {
            type: String,
            default: "",
            trim: true
        },

        // Keep this field for compatibility with existing products.
        image: {
            type: String,
            default: ""
        },

        // Additional images and selectable product variations.
        images: {
            type: [String],
            default: []
        },

        variationType: {
            type: String,
            enum: ["none", "color", "size", "arrangement"],
            default: "none"
        },

        variations: {
            type: [
                {
                    name: {
                        type: String,
                        required: true,
                        trim: true
                    },
                    images: {
                        type: [String],
                        default: []
                    }
                }
            ],
            default: []
        },

        stock: {
            type: Number,
            default: 0,
            min: 0
        },

        available: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Product", productSchema);
