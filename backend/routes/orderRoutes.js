import express from 'express';
import PrintOrder from '../models/PrintOrder.js';
import User from '../models/User.js';
import { protect, shopkeeperOnly } from '../middleware/auth.js';

const router = express.Router();

const getCurrentAcademicYear = () => {
  const now = new Date();
  const yr = now.getFullYear();
  const month = now.getMonth();
  return month >= 6
    ? `${yr}-${String(yr + 1).slice(-2)}`
    : `${yr - 1}-${String(yr).slice(-2)}`;
};

const generateCode = async () => {
  let code;
  let exists = true;
  while (exists) {
    code = Math.floor(100 + Math.random() * 900).toString();
    exists = await PrintOrder.findOne({ pickupCode: code, status: { $nin: ['Completed', 'Cancelled'] } });
  }
  return code;
};

// Create Multi-Document Order (Duplicate Guard + Single/Double-Sided Pricing)
router.post('/', protect, async (req, res) => {
  try {
    const shop = await User.findOne({ role: 'shopkeeper' });
    if (shop && shop.shopOpen === false) {
      return res.status(403).json({
        message: 'The print shop is currently on a break or maintenance. Please try again shortly.',
      });
    }

    // 60-Second Duplicate Order Guard
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const recentOrder = await PrintOrder.findOne({
      studentId: req.user.id,
      status: { $ne: 'Cancelled' },
      createdAt: { $gte: sixtySecondsAgo },
    });
    if (recentOrder) {
      return res.status(429).json({
        message: `Duplicate request blocked. Order #${recentOrder.pickupCode} was already submitted less than 1 minute ago.`,
      });
    }

    const { documents, notes } = req.body;
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ message: 'Please add at least one document.' });
    }

    const student = await User.findById(req.user.id);
    const bwRate = shop?.bwRate || 2;
    const doubleSidedRate = shop?.doubleSidedRate || 3;
    const colorRate = shop?.colorRate || 10;

    let totalCopies = 0;
    let totalPages = 0;
    let estimatedPrice = 0;

    const formattedDocs = documents.map((doc, idx) => {
      const pages = Math.max(1, Number(doc.pages || 1));
      const copies = Math.max(1, Number(doc.copies || 1));
      const isDouble = doc.sides === 'Double-Sided';

      let effectivePages = isDouble ? Math.ceil(pages / 2) : pages;
      let rate = doc.printType === 'Color' ? colorRate : isDouble ? doubleSidedRate : bwRate;

      totalCopies += copies;
      totalPages += pages * copies;
      estimatedPrice += rate * effectivePages * copies;

      return {
        docTitle: doc.docTitle?.trim() || `Document ${idx + 1}`,
        fileLink: doc.fileLink,
        pages,
        copies,
        printType: doc.printType || 'B&W',
        sides: doc.sides || 'Single-Sided',
      };
    });

    const pickupCode = await generateCode();
    const order = await PrintOrder.create({
      studentId: student._id,
      studentName: student.name,
      studentPhone: student.phone,
      studentDepartment: student.department || 'General',
      academicYear: getCurrentAcademicYear(),
      documents: formattedDocs,
      totalCopies,
      totalPages,
      estimatedPrice,
      notes: notes || '',
      pickupCode,
      paymentStatus: 'Unpaid',
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Student's Own Order History
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await PrintOrder.find({ studentId: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Student Cancel Order (Only while Pending)
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await PrintOrder.findOne({ _id: req.params.id, studentId: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.status !== 'Pending') {
      return res.status(400).json({ message: 'Cannot cancel an order once printing has started.' });
    }

    order.status = 'Cancelled';
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get All Orders (Shopkeeper Only)
router.get('/all', protect, shopkeeperOnly, async (req, res) => {
  try {
    const orders = await PrintOrder.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Order Status
router.patch('/:id/status', protect, shopkeeperOnly, async (req, res) => {
  try {
    const updateFields = { status: req.body.status };
    if (req.body.status === 'Ready') {
      updateFields.readyAt = new Date();
    }
    if (req.body.status === 'File Issue') {
      updateFields.rejectionReason = req.body.rejectionReason || 'Private link or unreadable file';
    } else {
      updateFields.rejectionReason = '';
    }

    const updated = await PrintOrder.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { returnDocument: 'after' }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Apply / Edit Extra Charge & Reason
router.patch('/:id/extra-charge', protect, shopkeeperOnly, async (req, res) => {
  try {
    const amount = Number(req.body.extraCharge || 0);
    const reason = (req.body.extraChargeReason || '').trim();
    if (amount <= 0 || !reason) {
      return res.status(400).json({ message: 'Please enter a valid charge amount and reason.' });
    }

    const updated = await PrintOrder.findByIdAndUpdate(
      req.params.id,
      { extraCharge: amount, extraChargeReason: reason },
      { returnDocument: 'after' }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark Single Order Paid
router.patch('/:id/pay', protect, shopkeeperOnly, async (req, res) => {
  try {
    const updated = await PrintOrder.findByIdAndUpdate(
      req.params.id,
      { paymentStatus: 'Paid' },
      { returnDocument: 'after' }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// One-Click Year-End Settle All Pending Orders for a Student
router.patch('/settle-student/:studentId', protect, shopkeeperOnly, async (req, res) => {
  try {
    await PrintOrder.updateMany(
      { studentId: req.params.studentId, paymentStatus: { $ne: 'Paid' }, status: { $ne: 'Cancelled' } },
      { $set: { paymentStatus: 'Paid' } }
    );
    await User.findByIdAndUpdate(req.params.studentId, { partialPaidTotal: 0 });
    res.json({ message: 'All pending orders settled successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Privacy-Protected Order Tracking (Requires 3-digit code + last 4 digits of student phone)
router.get('/track/:code', async (req, res) => {
  try {
    const phoneLast4 = (req.query.phoneLast4 || '').trim();
    if (phoneLast4.length !== 4) {
      return res.status(400).json({ message: 'Please enter the last 4 digits of your registered phone number.' });
    }

    const order = await PrintOrder.findOne({ pickupCode: req.params.code }).sort({ createdAt: -1 });
    if (!order) {
      return res.status(404).json({ message: 'No order found with this pickup code.' });
    }

    const cleanPhone = (order.studentPhone || '').replace(/\D/g, '');
    if (!cleanPhone.endsWith(phoneLast4)) {
      return res.status(403).json({ message: 'Phone digits do not match this pickup code.' });
    }

    res.json({
      pickupCode: order.pickupCode,
      studentName: order.studentName,
      documents: order.documents,
      totalCopies: order.totalCopies,
      totalPages: order.totalPages,
      status: order.status,
      rejectionReason: order.rejectionReason,
      paymentStatus: order.paymentStatus,
      estimatedPrice: order.estimatedPrice,
      extraCharge: order.extraCharge,
      extraChargeReason: order.extraChargeReason,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;