const Razorpay = require('razorpay');
try {
    const rzp = new Razorpay({
        key_id: 'rzp_live_SQdSBMmgL1mZZa',
        key_secret: 'Sew2homjpULowkPhqxOsSS47'
    });
    console.log('Razorpay initialized successfully');
} catch (e) {
    console.error('Razorpay initialization failed:', e);
}
