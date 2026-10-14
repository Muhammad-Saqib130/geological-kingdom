import { Product } from '../models/Product.js';

// Reserves stock for every line, one atomic conditional update per product.
// If any line cannot be reserved, the ones already taken are put back and null is returned.
// (Works without multi-document transactions, so it runs on any MongoDB deployment.)
export async function reserveStock(lines) {
  const taken = [];
  for (const line of lines) {
    const ok = await Product.findOneAndUpdate(
      { _id: line.product, isActive: true, stock: { $gte: line.qty } },
      { $inc: { stock: -line.qty } },
    );
    if (!ok) {
      await releaseLines(taken);
      return { ok: false, failed: line };
    }
    taken.push(line);
  }
  return { ok: true };
}

export async function releaseLines(lines) {
  await Promise.all(lines.map((l) => Product.updateOne({ _id: l.product }, { $inc: { stock: l.qty } })));
}
