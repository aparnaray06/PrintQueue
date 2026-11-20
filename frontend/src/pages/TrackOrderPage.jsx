import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api.js';

function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [phoneLast4, setPhoneLast4] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  const fetchOrder = async (targetCode, targetPhone4) => {
    if (targetCode.length !== 3) return;
    try {
      const query = targetPhone4 ? `?phoneLast4=${targetPhone4}` : '';
      const res = await api.get(`/orders/track/${targetCode}${query}`);
      setOrder(res.data);
      setError('');
    } catch (err) {
      setOrder(null);
      setError(
        err.response?.data?.message ||
          'No active order found matching this pickup code. It may already be completed or cancelled.'
      );
    }
  };

  useEffect(() => {
    if (code.length !== 3) {
      setOrder(null);
      setError('');
      return;
    }
    fetchOrder(code, phoneLast4);
    const interval = setInterval(() => fetchOrder(code, phoneLast4), 5000);
    return () => clearInterval(interval);
  }, [code, phoneLast4]);

  const getBadgeClass = (status) => {
    if (status === 'Ready') return 'badge badge-ready';
    if (status === 'Printing') return 'badge badge-printing';
    return 'badge badge-pending';
  };

  const grandTotal = order
    ? Number(order.estimatedPrice || 0) + Number(order.extraCharge || 0)
    : 0;

  return (
    <div className="container-sm">
      <div className="card">
        <h1 className="page-title">Track Print Status</h1>
        <p className="page-subtitle">
          Enter your 3-digit pickup code to check live status. Last 4 phone digits are optional.
        </p>

        <div className="form-row">
          <div>
            <label className="field-label">3-Digit Pickup Code *</label>
            <input
              type="text"
              maxLength="3"
              placeholder="e.g. 482"
              className="input-box"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div>
            <label className="field-label">Last 4 Phone Digits (Optional)</label>
            <input
              type="text"
              maxLength="4"
              placeholder="Optional (e.g. 7890)"
              className="input-box"
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        {order && (
          <div className="status-result">
            <p><strong>Pickup Code:</strong> #{order.pickupCode}</p>
            <p><strong>Student:</strong> {order.studentName}</p>
            {order.shopEmail && <p><strong>Print Shop:</strong> {order.shopEmail}</p>}
            <div>
              <strong>Documents ({order.documents?.length || 1}):</strong>
              <ul className="doc-list-compact">
                {order.documents?.map((d, i) => (
                  <li key={i}>
                    {d.docTitle} — {d.pages || 1} pg × {d.copies} copy ({d.printType}, {d.sides})
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Base Bill:</strong> ₹{order.estimatedPrice}
              {order.extraCharge > 0 && (
                <div className="extra-charge-tag">
                  <strong>Extra Charge: +₹{order.extraCharge}</strong>
                  <div>Reason: {order.extraChargeReason}</div>
                </div>
              )}
              <p><strong>Total Payable:</strong> ₹{grandTotal} ({order.paymentStatus})</p>
            </div>
            <p>
              <strong>Print Status:</strong>{' '}
              <span className={getBadgeClass(order.status)}>{order.status}</span>
            </p>
            {order.status === 'File Issue' && order.rejectionReason && (
              <div className="extra-charge-tag">
                <strong>Action Required:</strong> {order.rejectionReason}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrackOrderPage;