 import dotenv from "dotenv";
 dotenv.config();

 import express from "express";
 import Razorpay from "razorpay";
 import crypto from "crypto";
 import cors from "cors";

 const app = express();

 /* ------------------ MIDDLEWARE ------------------ */
 app.use(cors());
 app.use(express.json());

 /* ------------------ RAZORPAY INIT ------------------ */
 const razorpay = new Razorpay({
   key_id: process.env.RAZORPAY_KEY_ID,
   key_secret: process.env.RAZORPAY_KEY_SECRET,
 });

 /* ------------------ HEALTH CHECK ------------------ */
 app.get("/", (req, res) => {
   res.send("✅ Propmatics Razorpay Server is running");
 });

 /* ------------------ CREATE ORDER ------------------ */
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

 /* ------------------ VERIFY PAYMENT ------------------ */
 app.post("/api/razorpay/verify-payment", (req, res) => {
   try {
     const {
       razorpay_order_id,
       razorpay_payment_id,
       razorpay_signature,
     } = req.body;

     if (
       !razorpay_order_id ||
       !razorpay_payment_id ||
       !razorpay_signature
     ) {
       return res
         .status(400)
         .json({ success: false, message: "Invalid payload" });
     }

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
       .json({ success: false, message: "Verification failed" });
   }
 });

 /* ------------------ START SERVER ------------------ */
 const PORT = process.env.PORT || 4242;

 app.listen(PORT, () => {
   console.log(`✅ Server running on http://localhost:${PORT}`);
 });
