import mongoose from "mongoose";

// Set global transform for all schemas to handle _id serialization
mongoose.set('toJSON', {
  transform: function(_doc: any, ret: any) {
    if (ret._id && typeof ret._id === 'object') {
      ret._id = ret._id.toString();
    }
    if (ret.__v !== undefined) {
      delete ret.__v;
    }
    return ret;
  }
});

mongoose.set('toObject', {
  transform: function(_doc: any, ret: any) {
    if (ret._id && typeof ret._id === 'object') {
      ret._id = ret._id.toString();
    }
    if (ret.__v !== undefined) {
      delete ret.__v;
    }
    return ret;
  }
});

export default async (): Promise<any> => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not defined in .env");
  }

  const connection = await mongoose.connect(dbUrl);

  return connection.connection.db;
};
