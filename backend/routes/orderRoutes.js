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

const generateCode = async (shopId) => {
  let code;
  let exists = true;
  while (exists) {
    code = Math.floor(100 + Math.random() * 900).toString();
    exists = await PrintOrder.findOne({
      shopId,
      pickupCode: code,
      status: { $nin: ['Completed', 'Cancelled'] },
    });
  }
  return code;
};

// Create Multi-Document Order Routed to Selected Shopkeeper's Email
router.post('/', protect, async (req, res) => {
  try {
    const { documents, notes, shopEmail } = req.body;
    const student = await User.findById(req.user.id);

    const targetEmail = (shopEmail || student.shopEmail || '').toLowerCase().trim();
    if (!targetEmail) {
      return res.status(400).json({
        message: 'Please enter or select your college print shopkeeper email before submitting.',
      });
    }

    const shop = await User.findOne({ role: 'shopkeeper', email: targetEmail });
    if (!shop) {
      return res.status(404).json({
        message: 'No registered print shop found with this shopkeeper email.',
      });
    }

    if (shop.shopOpen === false) {
      return res.status(403).json({
        message: `${shop.shopName} is currently on a break or maintenance. Please try again shortly.`,
      });
    }

    // 60-Second Duplicate Order Guard
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const recentOrder = await PrintOrder.findOne({
      studentId: req.user.id,
      shopId: shop._id,
      status: { $ne: 'Cancelled' },
      createdAt: { $gte: sixtySecondsAgo },
    });
    if (recentOrder) {
      return res.status(429).json({
        message: `Duplicate request blocked. Order #${recentOrder.pickupCode} was already submitted less than 1 minute ago.`,
      });
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ message: 'Please add at least one document.' });
    }

    // Save selected shop onto student profile for future orders
    if (!student.shopId || student.shopEmail !== shop.email) {
      student.shopId = shop._id;
      student.shopEmail = shop.email;
      await student.save();
    }

    const bwRate = shop.bwRate || 2;
    const doubleSidedRate = shop.doubleSidedRate || 3;
    const colorRate = shop.colorRate || 10;

    let totalCopies = 0;
    let totalPages = 0;
    let estimatedPrice = 0;

    const formattedDocs = documents.map((doc, idx) => {
      const pages = Math.max(1, Number(doc.pages || 1));
      const copies = Math.max(1, Number(doc.copies || 1));
      const isDouble = doc.sides === 'Double-Sided';

      const effectivePages = isDouble ? Math.ceil(pages / 2) : pages;
      const rate = doc.printType === 'Color' ? colorRate : isDouble ? doubleSidedRate : bwRate;

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

    const pickupCode = await generateCode(shop._id);
    const order = await PrintOrder.create({
      shopId: shop._id,
      shopEmail: shop.email,
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

// Get All Orders ONLY for Logged-In Shopkeeper
router.get('/all', protect, shopkeeperOnly, async (req, res) => {
  try {
    const orders = await PrintOrder.find({ shopId: req.user.id }).sort({ createdAt: -1 });
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

    const updated = await PrintOrder.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.id },
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

    const updated = await PrintOrder.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.id },
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
    const updated = await PrintOrder.findOneAndUpdate(
      { _id: req.params.id, shopId: req.user.id },
      { paymentStatus: 'Paid' },
      { returnDocument: 'after' }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// One-Click Year-End Settle All Pending Orders for a Student (Scoped to This Shopkeeper)
router.patch('/settle-student/:studentId', protect, shopkeeperOnly, async (req, res) => {
  try {
    await PrintOrder.updateMany(
      {
        shopId: req.user.id,
        studentId: req.params.studentId,
        paymentStatus: { $ne: 'Paid' },
        status: { $ne: 'Cancelled' },
      },
      { $set: { paymentStatus: 'Paid' } }
    );
    await User.findByIdAndUpdate(req.params.studentId, { partialPaidTotal: 0 });
    res.json({ message: 'All pending orders settled successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Order Tracking: 3-Digit Pickup Code Required, Last 4 Phone Digits Optional
router.get('/track/:code', async (req, res) => {
  try {
    const code = (req.params.code || '').trim();
    const phoneLast4 = (req.query.phoneLast4 || '').trim();

    if (code.length !== 3) {
      return res.status(400).json({ message: 'Please enter a valid 3-digit pickup code.' });
    }

    const matchingOrders = await PrintOrder.find({ pickupCode: code }).sort({ createdAt: -1 });

    if (matchingOrders.length === 0) {
      return res.status(404).json({
        message: 'No order found matching this pickup code. Please check the code and try again.',
      });
    }

    // Filter by optional phoneLast4 if provided
    let candidateOrders = matchingOrders;
    if (phoneLast4.length > 0) {
      candidateOrders = matchingOrders.filter((o) =>
        (o.studentPhone || '').replace(/\D/g, '').endsWith(phoneLast4)
      );
      if (candidateOrders.length === 0) {
        return res.status(404).json({
          message: 'No order matches this pickup code and phone digits. Clear the phone box if you are unsure.',
        });
      }
    }

    // Prefer an active order first; if all matching orders are already Completed/Cancelled, inform the user clearly
    const activeOrder = candidateOrders.find(
      (o) => !['Completed', 'Cancelled'].includes(o.status)
    );

    if (!activeOrder) {
      const latestClosed = candidateOrders[0];
      return res.status(404).json({
        message:
          latestClosed.status === 'Completed'
            ? `Order #${code} has already been completed and picked up from the counter.`
            : `Order #${code} was cancelled and is no longer active.`,
      });
    }

    res.json({
      pickupCode: activeOrder.pickupCode,
      studentName: activeOrder.studentName,
      shopEmail: activeOrder.shopEmail,
      documents: activeOrder.documents,
      totalCopies: activeOrder.totalCopies,
      totalPages: activeOrder.totalPages,
      status: activeOrder.status,
      rejectionReason: activeOrder.rejectionReason,
      paymentStatus: activeOrder.paymentStatus,
      estimatedPrice: activeOrder.estimatedPrice,
      extraCharge: activeOrder.extraCharge,
      extraChargeReason: activeOrder.extraChargeReason,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;