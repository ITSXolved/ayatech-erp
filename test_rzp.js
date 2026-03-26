const Razorpay = require('razorpay');
require('dotenv').config();

const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function main() {
    console.log("Checking keys...");
    console.log("Key ID:", process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID);
    
    try {
        const orders = await razorpay.orders.all({ count: 1 });
        console.log("Success! Fetched last order.");
        console.log("Last Order:", orders.items[0]?.id || "None");
    } catch (e) {
        console.error("Authentication Error:", e.message);
    }
}
main();
