import mongoose from "mongoose";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGO_URI);
const LiftState = mongoose.model("LiftState", new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  liftName: String,
  stallCounter: Number
}));
const User = mongoose.model("User", new mongoose.Schema({ email: String }));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

async function checkStalls() {
  const stalled = await LiftState.find({ stallCounter: { $gte: 3 } }).populate("userId");
  for (const s of stalled) {
    const adminEmail = process.env.ADMIN_EMAIL || "kieren2203@googlemail.com";
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `⚠️ Stall detected on ${s.liftName}`,
      html: `<p>User: ${s.userId.email}</p>
             <p>Lift: ${s.liftName}</p>
             <p>Stall counter: ${s.stallCounter}</p>
             <p>Consider reaching out: “I noticed your ${s.liftName} progression has stalled – want a free form check?”</p>`
    });
    console.log(`📧 Stall alert sent for ${s.userId.email} – ${s.liftName}`);
  }
  mongoose.disconnect();
}

checkStalls();