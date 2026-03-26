const keyId = 'rzp_live_SQdSBMmgL1mZZa';
const keySecret = 'Sew2homjpULowkPhqxOsSS47';

async function testOrderCreation() {
    console.log("Testing Razorpay Order Creation with ₹1...");
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
    try {
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: 100, // ₹1 in paise
                currency: 'INR',
                receipt: `test_1_${Date.now()}`
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("SUCCESS! ₹1 order created.");
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
