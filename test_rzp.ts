import Razorpay from 'razorpay';
import 'dotenv/config';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!
});

async function main() {
    try {
        const orders = await razorpay.orders.all({ receipt: 'app_6bf96ba181054a1dbb5dcc9ccf3b26' }); // Example receipt format from Razorpay-actions.ts
        console.log("Orders:", orders);
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
