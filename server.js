import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config(); // still used for Razorpay keys if present

const app = express();

/* ------------------ MIDDLEWARE ------------------ */
app.use(cors());
app.use(express.json());

/* ------------------ RAZORPAY INIT ------------------ */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* =================================================
   MONGODB (HARDCODED)
================================================= */

const MONGODB_URI =
  "mongodb+srv://techt29:Nizam9hy@propmatics.htitze5.mongodb.net/?appName=propmatics";

const MONGODB_DB = "propmatics";

let mongoClient;
let mongoDb;

async function connectMongo() {
  if (mongoDb) return mongoDb;

  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();

  mongoDb = mongoClient.db(MONGODB_DB);
  console.log("✅ MongoDB connected");

  return mongoDb;
}

/* ------------------ HEALTH CHECK ------------------ */
app.get("/", (req, res) => {
  res.send("✅ Propmatics Server is running (Razorpay + Newsletter)");
});

/* =================================================
   RAZORPAY APIs
================================================= */

app.post("/api/razorpay/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 1) {
      return res
        .status(400)
        .json({ error: "Amount must be at least ₹1" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // rupees → paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    res.json(order);
  } catch (error) {
    console.error("❌ Razorpay Order Error:", error);
    res
      .status(500)
      .json({ error: "Unable to create Razorpay order" });
  }
});

app.post("/api/razorpay/verify-payment", (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const sign =
      razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }
  } catch (error) {
    console.error("❌ Razorpay Verify Error:", error);
    res
      .status(500)
      .json({ success: false });
  }
});

/* =================================================
   NEWSLETTER APIs (MongoDB)
================================================= */

app.post("/api/newsletter/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    const db = await connectMongo();
    const collection = db.collection("newsletter_subscribers");

    const existing = await collection.findOne({ email });
    if (existing) {
      return res.json({
        success: true,
        message: "Already subscribed",
      });
    }

    await collection.insertOne({
      email,
      subscribedAt: new Date(),
      source: "propmatics.com",
    });

    res.json({
      success: true,
      message: "Subscribed successfully",
    });
  } catch (error) {
    console.error("❌ Newsletter Mongo Error:", error);
    res
      .status(500)
      .json({ error: "Subscription failed" });
  }
});

/* ------------------ START SERVER ------------------ */
const PORT = process.env.PORT || 4242;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
