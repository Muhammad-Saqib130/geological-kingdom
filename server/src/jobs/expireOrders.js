import { expireOverdueOrders } from '../services/orderService.js';

const EVERY = 5 * 60 * 1000;

// Cancels unpaid orders whose hold has run out, releasing their stones back to the shop.
export function startOrderExpiryJob() {
  const run = async () => {
    try {
      const n = await expireOverdueOrders();
      if (n) console.log(`Released ${n} expired unpaid order${n === 1 ? '' : 's'}`);
    } catch (err) {
      console.error(`Order expiry job failed: ${err.message}`);
    }
  };
  run();
  const timer = setInterval(run, EVERY);
  timer.unref();
  return () => clearInterval(timer);
}
