const mongoose = require("mongoose");

const storeSettingSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true },
        values: { type: [String], default: [] }
    },
    { timestamps: true }
);

module.exports = mongoose.model("StoreSetting", storeSettingSchema);
