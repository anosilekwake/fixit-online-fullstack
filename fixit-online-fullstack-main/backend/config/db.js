// config/db.js
import { connect as _connect } from "mongoose";

async function connect(uri) {
  await _connect(uri, { autoIndex: true });
  console.log("MongoDB connected");
}

export default connect;
