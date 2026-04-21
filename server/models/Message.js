const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  author: String,
  message: String,
  time: String,
  room: String,
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);