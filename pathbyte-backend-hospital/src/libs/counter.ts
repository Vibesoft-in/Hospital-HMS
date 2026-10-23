import mongoose, { Schema } from "mongoose";

const counterSchema = new Schema({
  _id: String, 
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

export async function getNextSequence(name: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}
