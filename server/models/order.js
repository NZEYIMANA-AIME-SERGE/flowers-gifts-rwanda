const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        customer: {
            name: {
                type: String,
                required: true,
                trim: true
            },

            phone: {
                type: String,
                required: true,
                trim: true
            },

            email: {
                type: String,
                trim: true,
                default: ""
            }
        },

        recipient: {
            name: {
                type: String,
                required: true,
                trim: true
            },

            phone: {
                type: String,
                required: true,
                trim: true
            }
        },

        delivery: {
            location: {
                type: String,
                required: true,
                trim: true
            },

            date: {
                type: String,
                required: true
            }
        },

        giftMessage: {
            type: String,
            default: "",
            trim: true
        },

        items: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true
                },

                name: {
                    type: String,
                    required: true,
                    trim: true
                },

                price: {
                    type: Number,
                    required: true,
                    min: 0
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                },

                image: {
                    type: String,
                    default: ""
                },

                itemTotal: {
                    type: Number,
                    required: true,
                    min: 0
                }
            }
        ],

        subtotal: {
            type: Number,
            required: true,
            min: 0
        },

        deliveryFee: {
            type: Number,
            default: 0,
            min: 0
        },

        total: {
            type: Number,
            required: true,
            min: 0
        },

        paymentMethod: {
            type: String,
            trim: true,
            default: ""
        },

        paymentStatus: {
            type: String,
            enum: [
                "pending",
                "paid",
                "failed"
            ],
            default: "pending"
        },

        orderStatus: {
            type: String,
            enum: [
                "pending",
                "confirmed",
                "preparing",
                "out_for_delivery",
                "delivered",
                "cancelled"
            ],
            default: "pending"
        }
    },

    {
        timestamps: true
    }
);

module.exports = mongoose.model("Order", orderSchema);