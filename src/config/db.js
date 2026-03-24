const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.NODE_ENV === 'test' 
      ? 'mongodb://127.0.0.1:27017/authx_test' 
      : process.env.MONGO_URI;
      
    await mongoose.connect(uri);

    if (process.env.NODE_ENV !== 'test') {
      console.log("✅ MongoDB Connected");
    }
  } catch (error) {
    console.error("❌ DB Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
