const keyId = 'rzp_live_SQdSBMmgL1mZZa';
const keySecret = 'Sew2homjpULowkPhqxOsSS47';

async function testRazorpay() {
    console.log("Testing Razorpay Credentials via Fetch API...");
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
    try {
        const response = await fetch('https://api.razorpay.com/v1/orders?count=1', {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log("SUCCESS! Credentials are valid.");
            console.log("Last Order ID:", data.items[0]?.id || "None");
        } else {
            const errText = await response.text();
            console.error("FAILURE! Status:", response.status);
            console.error("Error Details:", errText);
        }
    } catch (err) {
        console.error("Network/Fetch Error:", err.message);
    }
}

testRazorpay();
