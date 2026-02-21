export const environment = {
  production: false,
  apiUrl: 'https://get-order-stack-restaurant-backend.onrender.com/api',
  socketUrl: 'https://get-order-stack-restaurant-backend.onrender.com',
  // Must be replaced with a real Stripe publishable key before payments work
  stripePublishableKey: 'pk_test_placeholder',
  // 'sb' = PayPal sandbox; replace with real client ID for production
  paypalClientId: 'sb',
};
