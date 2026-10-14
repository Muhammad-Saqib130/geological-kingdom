import mongoose from 'mongoose';

// Atomic sequences, e.g. { _id: 'order-2026', seq: 41 }
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false });

counterSchema.statics.next = async function next(name) {
  const doc = await this.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' });
  return doc.seq;
};

export const Counter = mongoose.model('Counter', counterSchema);
