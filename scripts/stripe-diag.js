
const Stripe = require('stripe');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from the root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const secretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

console.log('--- Stripe Diagnostics ---');
console.log('Secret Key exists:', !!secretKey);
console.log('Secret Key starts with:', secretKey ? secretKey.substring(0, 8) : 'N/A');
console.log('Publishable Key exists:', !!publishableKey);
console.log('Publishable Key starts with:', publishableKey ? publishableKey.substring(0, 8) : 'N/A');

if (!secretKey || secretKey.includes('YOUR_SECRET_KEY')) {
  console.error('ERROR: STRIPE_SECRET_KEY is missing or contains the placeholder "YOUR_SECRET_KEY".');
  process.exit(1);
}

const stripe = new Stripe(secretKey, {
  apiVersion: '2025-01-27.acacia', // Or another valid version
});

async function testConnection() {
  try {
    console.log('Attempting to create a test PaymentIntent...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
      payment_method_types: ['card'],
    });
    console.log('SUCCESS: PaymentIntent created!', paymentIntent.id);
  } catch (error) {
    console.error('FAILURE: Could not create PaymentIntent.');
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Type:', error.type);
  }
}

testConnection();
