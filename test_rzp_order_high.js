const keyId = 'rzp_live_SQdSBMmgL1mZZa';
const keySecret = 'm5vHNd1Z6EN6oCFv8I9XUaVk';

async function testOrderCreation() {
    console.log("Testing Razorpay Order Creation with ₹100...");
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
    try {
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: 10000, // ₹100 in paise
                currency: 'INR',
                receipt: `test_${Date.now()}`
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("SUCCESS! order created.");
            console.log("Order ID:", data.id);
        } else {
            const errText = await response.text();
            console.error("FAILURE! Status:", response.status);
            console.error("Error Details:", errText);
        }
    } catch (err) {
        console.error("Network/Fetch Error:", err.message);
    }
}

testOrderCreation();
