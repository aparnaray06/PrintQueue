import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['student', 'shopkeeper'], default: 'student' },
  department: { type: String },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  shopEmail: { type: String, lowercase: true, trim: true, default: '' },
  partialPaidTotal: { type: Number, default: 0 },
  shopName: { type: String },
  shopAddress: { type: String },
  shopOpen: { type: Boolean, default: true },
  bwRate: { type: Number, default: 2 },
  doubleSidedRate: { type: Number, default: 3 },
  colorRate: { type: Number, default: 10 },
}, { timestamps: true });

export default mongoose.model('User', userSchema);