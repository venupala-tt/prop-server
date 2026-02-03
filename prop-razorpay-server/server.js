import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4242;

/* -------------------- Middleware -------------------- */
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://propmatics.com",
      "https://www.propmatics.com",
    ],
    methods: ["GET", "POST"],
  })
);

/* -------------------- Razorpay Init -------------------- */
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("❌ Razorpay keys are missing in .env");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* -------------------- Routes -------------------- */

/**
 * Create Razorpay Order
 */
app.post("/api/razorpay/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100, // convert to paise
      currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    res.json(order);
  } catch (error) {
    console.error("❌ Razorpay Order Error:", error);
    res.status(500).json({ error: "Unable to create order" });
  }
});

/**
 * Verify Razorpay Payment
 */
app.post("/api/razorpay/verify-payment", (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      // ✅ Payment verified
      // TODO: Save booking + payment in DB

      return res.json({
        status: "success",
        message: "Payment verified & booking confirmed",
      });
    } else {
      return res.status(400).json({
        status: "failure",
        message: "Payment verification failed",
      });
    }
  } catch (error) {
    console.error("❌ Verification Error:", error);
    res.status(500).json({ error: "Verification error" });
  }
});

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.send("🚀 Propmatics Razorpay Server is running");
});

/* -------------------- Start Server -------------------- */
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
