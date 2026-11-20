import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { COURSES_LIST } from '../constants/courses.js';

function ProfilePage() {
  const savedUser = JSON.parse(localStorage.getItem('pq_user') || 'null');
  const [user, setUser] = useState(savedUser);
  const [myOrders, setMyOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const [form, setForm] = useState({
    name: savedUser?.name || '',
    phone: savedUser?.phone || '',
    department: savedUser?.department || COURSES_LIST[0],
    shopName: savedUser?.shopName || '',
    shopAddress: savedUser?.shopAddress || '',
    bwRate: savedUser?.bwRate || 2,
    doubleSidedRate: savedUser?.doubleSidedRate || 3,
    colorRate: savedUser?.colorRate || 10,
  });

  const fetchMyOrders = () => {
    api.get('/orders/my-orders').then((res) => setMyOrders(res.data));
  };

  useEffect(() => {
    if (user?.role === 'student') {
      fetchMyOrders();
      const interval = setInterval(fetchMyOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleCancelOrder = async (orderId) => {
    try {
      await api.patch(`/orders/${orderId}/cancel`);
      setStatusMsg({ type: 'success', text: 'Pending print order cancelled.' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000);
      fetchMyOrders();
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Unable to cancel this order.',
      });
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg({ type: '', text: '' });

    try {
      const res = await api.put('/auth/profile', form);
      setUser(res.data);
      localStorage.setItem('pq_user', JSON.stringify(res.data));
      setStatusMsg({ type: 'success', text: 'Profile changes saved successfully.' });
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000);
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save changes.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const activeOrders = myOrders.filter((o) => o.status !== 'Cancelled');
  const totalCopies = activeOrders.reduce((sum, o) => sum + Number(o.totalCopies || o.copies || 0), 0);
  const totalPaidRs = activeOrders
    .filter((o) => o.paymentStatus === 'Paid')
    .reduce((sum, o) => sum + Number(o.estimatedPrice || 0) + Number(o.extraCharge || 0), 0);
  const totalUnpaidRs = activeOrders
    .filter((o) => o.paymentStatus !== 'Paid')
    .reduce((sum, o) => sum + Number(o.estimatedPrice || 0) + Number(o.extraCharge || 0), 0);

  return (
    <div className="container-lg">
      {user.role === 'student' && (
        <div className="card card-spaced">
          <h1 className="page-title">My Printout & Year-End Ledger</h1>
          <p className="page-subtitle">
            Course: <strong>{user.department}</strong> — Complete record of your print orders, extra charges, and payments
          </p>

          <div className="stats-row">
            <div className="stat-card">
              <div className="field-label">Active Orders</div>
              <div className="stat-value">{activeOrders.length}</div>
            </div>
            <div className="stat-card">
              <div className="field-label">Total Copies</div>
              <div className="stat-value">{totalCopies}</div>
            </div>
            <div className="stat-card">
              <div className="field-label">Paid Amount</div>
              <div className="stat-value-green">₹{totalPaidRs}</div>
            </div>
            <div className="stat-card">
              <div className="field-label">Year-End Due</div>
              <div className="stat-value-red">₹{totalUnpaidRs}</div>
            </div>
          </div>

          {myOrders.length === 0 ? (
            <p className="page-subtitle">No print orders submitted yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="order-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Date</th>
                    <th>Documents</th>
                    <th>Amount</th>
                    <th>Print Status</th>
                    <th>Payment & Action</th>
                  </tr>
                </thead>
                <tbody>
                  {myOrders.map((o) => (
                    <tr key={o._id}>
                      <td><strong>#{o.pickupCode}</strong></td>
                      <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td>
                        <ul className="doc-list-compact">
                          {(o.documents && o.documents.length > 0
                            ? o.documents
                            : [{ docTitle: 'Document', pages: 1, copies: o.copies, printType: o.printType, sides: o.sides }]
                          ).map((d, i) => (
                            <li key={i}>
                              <strong>{d.docTitle}</strong>: {d.pages || 1} pg × {d.copies} copy ({d.printType}, {d.sides})
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td>
                        <div>Base: ₹{o.estimatedPrice}</div>
                        {o.extraCharge > 0 && (
                          <div className="extra-charge-tag">
                            <strong>Extra Charge: +₹{o.extraCharge}</strong>
                            <div>Reason: {o.extraChargeReason}</div>
                          </div>
                        )}
                        <div><strong>Total: ₹{Number(o.estimatedPrice || 0) + Number(o.extraCharge || 0)}</strong></div>
                      </td>
                      <td>
                        <div><strong>{o.status}</strong></div>
                        {o.status === 'File Issue' && o.rejectionReason && (
                          <div className="extra-charge-tag">
                            <strong>Action Required:</strong> {o.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="action-group">
                          <span className={`badge ${o.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`}>
                            {o.paymentStatus}
                          </span>
                          {o.status === 'Pending' && (
                            <button
                              onClick={() => handleCancelOrder(o._id)}
                              className="btn-remove-doc"
                            >
                              Cancel Order
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2 className="page-title">
          {user.role === 'shopkeeper' ? 'Shop Profile & Pricing Settings' : 'Account Details'}
        </h2>
        <p className="page-subtitle">Signed in as: <strong>{user.email}</strong> ({user.role.toUpperCase()})</p>

        {statusMsg.text && (
          <div className={statusMsg.type === 'success' ? 'toast-success' : 'toast-error'}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="form-group">
          <div className="form-row">
            <div>
              <label className="field-label">Full Name</label>
              <input
                required
                className="input-box"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Phone Number</label>
              <input
                required
                className="input-box"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {user.role === 'student' && (
            <div>
              <label className="field-label">Course / Department</label>
              <select
                className="input-box"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                {COURSES_LIST.map((course) => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>
          )}

          {user.role === 'shopkeeper' && (
            <>
              <div className="form-row">
                <div>
                  <label className="field-label">Shop Name</label>
                  <input
                    required
                    className="input-box"
                    value={form.shopName}
                    onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Shop Address</label>
                  <input
                    required
                    className="input-box"
                    value={form.shopAddress}
                    onChange={(e) => setForm({ ...form, shopAddress: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-3">
                <div>
                  <label className="field-label">Single-Sided B&W (₹/sheet)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="input-box"
                    value={form.bwRate}
                    onChange={(e) => setForm({ ...form, bwRate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="field-label">Double-Sided B&W (₹/sheet)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="input-box"
                    value={form.doubleSidedRate}
                    onChange={(e) => setForm({ ...form, doubleSidedRate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="field-label">Color Print Rate (₹/sheet)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="input-box"
                    value={form.colorRate}
                    onChange={(e) => setForm({ ...form, colorRate: Number(e.target.value) })}
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;