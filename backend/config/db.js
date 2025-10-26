// config/db.js
const mongoose = require("mongoose");

async function connect(uri) {
  await mongoose.connect(uri, { autoIndex: true });
  console.log("MongoDB connected");
}

module.exports = connect;
