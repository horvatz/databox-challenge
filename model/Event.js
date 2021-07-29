const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    service: String,
    kpis: Number,
    successful: Boolean,
    metrics: Array,
    error: {
      status: String,
      message: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
