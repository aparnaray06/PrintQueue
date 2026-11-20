import mongoose from 'mongoose';

const documentItemSchema = new mongoose.Schema({
  docTitle: { type: String, default: 'Document' },
  fileLink: { type: String, required: true },
  pages: { type: Number, default: 1 },
  copies: { type: Number, default: 1 },
  printType: { type: String, enum: ['B&W', 'Color'], default: 'B&W' },
  sides: { type: String, enum: ['Single-Sided', 'Double-Sided'], default: 'Single-Sided' },
});

const printOrderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shopEmail: { type: String, lowercase: true, trim: true, default: '' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pickupCode: { type: String, required: true },
  studentName: { type: String, required: true },
  studentPhone: { type: String, required: true },
  studentDepartment: { type: String, default: 'General' },
  academicYear: { type: String, default: '2026-27' },
  documents: { type: [documentItemSchema], required: true },
  totalCopies: { type: Number, default: 1 },
  totalPages: { type: Number, default: 1 },
  estimatedPrice: { type: Number, default: 0 },
  extraCharge: { type: Number, default: 0 },
  extraChargeReason: { type: String, default: '' },
  rejectionReason: { type: String, default: '' },
  readyAt: { type: Date, default: null },
  notes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['Pending', 'Printing', 'Ready', 'Completed', 'File Issue', 'Cancelled'],
    default: 'Pending',
  },
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
}, { timestamps: true });

export default mongoose.model('PrintOrder', printOrderSchema);