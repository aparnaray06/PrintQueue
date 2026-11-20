import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PrintOrder from '../models/PrintOrder.js';
import { protect, shopkeeperOnly } from '../middleware/auth.js';

const router = express.Router();

// Register (Students can link via Shopkeeper Email)
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
      department,
      shopEmail,
      shopName,
      shopAddress,
    } = req.body;

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(400).json({ message: 'Email is already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const normalizedRole = (role || 'student').toLowerCase();

    let linkedShopId = null;
    let normalizedShopEmail = '';

    if (normalizedRole === 'student' && shopEmail) {
      normalizedShopEmail = shopEmail.toLowerCase().trim();
      const targetShop = await User.findOne({ role: 'shopkeeper', email: normalizedShopEmail });
      if (!targetShop) {
        return res.status(400).json({
          message: 'No print shop found with that shopkeeper email. Please check and try again.',
        });
      }
      linkedShopId = targetShop._id;
    }

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone,
      role: normalizedRole,
      department: normalizedRole === 'student' ? (department || 'B.Tech - CSE (Computer Science)') : undefined,
      shopId: linkedShopId,
      shopEmail: normalizedShopEmail,
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
    const user = await User.findOne({ email: email.toLowerCase().trim() });
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

// List All Registered Print Shops (With Shopkeeper Email & College Address)
router.get('/shops', async (req, res) => {
  try {
    const shops = await User.find({ role: 'shopkeeper' })
      .select('_id name email shopName shopAddress bwRate doubleSidedRate colorRate shopOpen phone')
      .sort({ shopName: 1 });
    res.json(shops);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Specific Shop Info by Shopkeeper Email or ID
router.get('/shop-info', async (req, res) => {
  try {
    const { shopEmail, shopId } = req.query;
    let query = { role: 'shopkeeper' };
    if (shopEmail) query.email = shopEmail.toLowerCase().trim();
    else if (shopId) query._id = shopId;

    const shop = await User.findOne(query).select(
      '_id name email shopName shopAddress bwRate doubleSidedRate colorRate phone shopOpen'
    );
    if (!shop) {
      return res.status(404).json({ message: 'Print shop not found for the given email.' });
    }
    res.json(shop);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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

// Update Profile (Allows Student to Update Linked Shopkeeper Email)
router.put('/profile', protect, async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.shopEmail !== undefined) {
      const cleanShopEmail = updates.shopEmail.toLowerCase().trim();
      if (cleanShopEmail) {
        const targetShop = await User.findOne({ role: 'shopkeeper', email: cleanShopEmail });
        if (!targetShop) {
          return res.status(400).json({
            message: 'No registered shopkeeper found with this email address.',
          });
        }
        updates.shopId = targetShop._id;
        updates.shopEmail = targetShop.email;
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      updates,
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

// Get Students Grouped by Department ONLY for Logged-In Shopkeeper
router.get('/students-by-department', protect, shopkeeperOnly, async (req, res) => {
  try {
    const { year } = req.query;
    const shopId = req.user.id;

    const orderFilter = { shopId, status: { $ne: 'Cancelled' } };
    if (year && year !== 'All') {
      orderFilter.academicYear = year;
    }

    const orders = await PrintOrder.find(orderFilter).sort({ createdAt: -1 });
    const orderStudentIds = orders.map((o) => o.studentId);

    const students = await User.find({
      role: { $regex: /^student$/i },
      $or: [{ shopId }, { _id: { $in: orderStudentIds } }],
    })
      .select('-password')
      .sort({ department: 1, name: 1 });

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