import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PrintOrder from '../models/PrintOrder.js';
import { protect, shopkeeperOnly } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, department, shopName, shopAddress } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email is already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedRole = (role || 'student').toLowerCase();

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: normalizedRole,
      department: normalizedRole === 'student' ? (department || 'B.Tech - CSE (Computer Science)') : undefined,
      shopName: normalizedRole === 'shopkeeper' ? shopName : undefined,
      shopAddress: normalizedRole === 'shopkeeper' ? shopAddress : undefined,
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ token, user: userObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid email or password.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid email or password.' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const userObj = user.toObject();
    delete userObj.password;

    res.json({ token, user: userObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Shop Info & Rates
router.get('/shop-info', async (req, res) => {
  const shop = await User.findOne({ role: 'shopkeeper' }).select(
    'shopName shopAddress bwRate doubleSidedRate colorRate phone shopOpen'
  );
  res.json(
    shop || {
      shopName: 'Campus Print Shop',
      shopAddress: 'Main Gate',
      bwRate: 2,
      doubleSidedRate: 3,
      colorRate: 10,
      shopOpen: true,
    }
  );
});

// Toggle Shop Open / Paused Status (Shopkeeper Only)
router.patch('/shop-status', protect, shopkeeperOnly, async (req, res) => {
  try {
    const shop = await User.findById(req.user.id);
    shop.shopOpen = !shop.shopOpen;
    await shop.save();
    res.json({ shopOpen: shop.shopOpen });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Profile
router.put('/profile', protect, async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      req.body,
      { returnDocument: 'after' }
    ).select('-password');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Record Partial Payment towards a Student's Year-End Ledger (Shopkeeper Only)
router.patch('/students/:studentId/partial-pay', protect, shopkeeperOnly, async (req, res) => {
  try {
    const amount = Number(req.body.amount || 0);
    if (amount <= 0) {
      return res.status(400).json({ message: 'Please enter a valid payment amount.' });
    }
    const student = await User.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    student.partialPaidTotal = Number(student.partialPaidTotal || 0) + amount;
    await student.save();
    res.json({ partialPaidTotal: student.partialPaidTotal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Students Grouped by Department with Optional Academic Year Filter (Shopkeeper Only)
router.get('/students-by-department', protect, shopkeeperOnly, async (req, res) => {
  try {
    const { year } = req.query;
    const students = await User.find({ role: { $regex: /^student$/i } })
      .select('-password')
      .sort({ department: 1, name: 1 });

    const orderFilter = { status: { $ne: 'Cancelled' } };
    if (year && year !== 'All') {
      orderFilter.academicYear = year;
    }

    const orders = await PrintOrder.find(orderFilter).sort({ createdAt: -1 });
    const groupedMap = {};

    students.forEach((st) => {
      const dept = st.department || 'Other';
      if (!groupedMap[dept]) {
        groupedMap[dept] = {
          department: dept,
          studentCount: 0,
          totalOrders: 0,
          totalCopies: 0,
          totalPaid: 0,
          totalPending: 0,
          students: [],
        };
      }

      const stOrders = orders.filter(
        (o) => o.studentId && o.studentId.toString() === st._id.toString()
      );

      const copies = stOrders.reduce(
        (sum, o) => sum + Number(o.totalCopies || o.copies || 0),
        0
      );
      const settledOrdersSum = stOrders
        .filter((o) => o.paymentStatus === 'Paid')
        .reduce((sum, o) => sum + Number(o.estimatedPrice || 0) + Number(o.extraCharge || 0), 0);
      const rawUnpaidSum = stOrders
        .filter((o) => o.paymentStatus !== 'Paid')
        .reduce((sum, o) => sum + Number(o.estimatedPrice || 0) + Number(o.extraCharge || 0), 0);

      const partialCredit = Number(st.partialPaidTotal || 0);
      const effectivePaid = settledOrdersSum + partialCredit;
      const effectivePending = Math.max(0, rawUnpaidSum - partialCredit);

      groupedMap[dept].studentCount += 1;
      groupedMap[dept].totalOrders += stOrders.length;
      groupedMap[dept].totalCopies += copies;
      groupedMap[dept].totalPaid += effectivePaid;
      groupedMap[dept].totalPending += effectivePending;

      groupedMap[dept].students.push({
        _id: st._id,
        name: st.name,
        email: st.email,
        phone: st.phone,
        department: dept,
        totalOrders: stOrders.length,
        totalCopies: copies,
        partialPaidTotal: partialCredit,
        paidAmount: effectivePaid,
        unpaidAmount: effectivePending,
        orders: stOrders,
      });
    });

    res.json(Object.values(groupedMap));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;