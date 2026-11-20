import React, { useState } from 'react';

function StudentHistoryView({
  student,
  onBack,
  onSettleAll,
  onRecordPartial,
  onOpenFineModal,
  onMarkPaid,
}) {
  const [partialAmount, setPartialAmount] = useState('');

  const handlePartialSubmit = (e) => {
    e.preventDefault();
    onRecordPartial(student._id, Number(partialAmount));
    setPartialAmount('');
  };

  const unpaidOrders = student.orders.filter((o) => o.paymentStatus !== 'Paid');
  const paidOrders = student.orders.filter((o) => o.paymentStatus === 'Paid');

  return (
    <div className="student-detail-panel printable-area">
      <div className="detail-top-bar">
        <div>
          <h2 className="page-title">{student.name} — Complete Student Ledger</h2>
          <p className="page-subtitle">
            Department: <strong>{student.department}</strong> | Phone: {student.phone} | Statement Date: {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="action-group no-print">
          <button onClick={() => window.print()} className="btn-sm btn-warn">
            Print / Save Statement
          </button>
          {student.unpaidAmount > 0 && (
            <button
              onClick={() => onSettleAll(student._id, student.name)}
              className="btn-pay"
            >
              Settle Full Year-End Due (₹{student.unpaidAmount})
            </button>
          )}
          <button onClick={onBack} className="btn-back-dept">
            ← Back to Departments
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="field-label">Total Orders</div>
          <div className="stat-value">{student.totalOrders}</div>
        </div>
        <div className="stat-card">
          <div className="field-label">Partial Credit Paid</div>
          <div className="stat-value">₹{student.partialPaidTotal || 0}</div>
        </div>
        <div className="stat-card">
          <div className="field-label">Total Paid</div>
          <div className="stat-value-green">₹{student.paidAmount}</div>
        </div>
        <div className="stat-card">
          <div className="field-label">Remaining Due</div>
          <div className="stat-value-red">₹{student.unpaidAmount}</div>
        </div>
      </div>

      {student.unpaidAmount > 0 && (
        <form onSubmit={handlePartialSubmit} className="partial-pay-bar no-print">
          <input
            required
            type="number"
            min="1"
            max={student.unpaidAmount}
            placeholder="Enter partial cash/UPI received (₹)"
            className="dept-search-box"
            value={partialAmount}
            onChange={(e) => setPartialAmount(e.target.value)}
          />
          <button type="submit" className="btn-sm btn-success">
            Record Partial Payment
          </button>
        </form>
      )}

      <div className="history-split-section">
        <div className="ledger-box-unpaid">
          <div className="ledger-box-header-unpaid">
            <span>Unpaid Orders ({unpaidOrders.length})</span>
            <span>Remaining Balance: ₹{student.unpaidAmount}</span>
          </div>
          {unpaidOrders.length === 0 ? (
            <p className="ledger-empty-note">No unpaid orders for this student.</p>
          ) : (
            <div className="table-wrapper">
              <table className="order-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Date</th>
                    <th>Documents</th>
                    <th>Base + Extra Charge</th>
                    <th>Status</th>
                    <th className="no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidOrders.map((ord) => {
                    const grandTotal = Number(ord.estimatedPrice || 0) + Number(ord.extraCharge || 0);
                    return (
                      <tr key={ord._id}>
                        <td><strong>#{ord.pickupCode}</strong></td>
                        <td>{new Date(ord.createdAt).toLocaleDateString()}</td>
                        <td>
                          <ul className="doc-list-compact">
                            {(ord.documents || []).map((d, idx) => (
                              <li key={idx}>
                                <strong>{d.docTitle}</strong> ({d.pages || 1} pg × {d.copies} copy, {d.printType}, {d.sides})
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td>
                          <div>Base: ₹{ord.estimatedPrice}</div>
                          {ord.extraCharge > 0 && (
                            <div className="extra-charge-tag">
                              +₹{ord.extraCharge} ({ord.extraChargeReason})
                            </div>
                          )}
                          <div><strong>Total: ₹{grandTotal}</strong></div>
                        </td>
                        <td>{ord.status}</td>
                        <td className="no-print">
                          <div className="action-group">
                            <button onClick={() => onOpenFineModal(ord)} className="btn-fine">
                              {ord.extraCharge > 0 ? 'Edit Charge' : '+ Extra Charge'}
                            </button>
                            <button onClick={() => onMarkPaid(ord._id)} className="btn-pay">
                              Mark Paid (₹{grandTotal})
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="history-split-section">
        <div className="ledger-box-paid">
          <div className="ledger-box-header-paid">
            <span>Paid / Settled Orders ({paidOrders.length})</span>
            <span>Total Paid: ₹{student.paidAmount}</span>
          </div>
          {paidOrders.length === 0 ? (
            <p className="ledger-empty-note">No paid orders recorded yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="order-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Date</th>
                    <th>Documents</th>
                    <th>Base + Extra Charge</th>
                    <th>Status</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {paidOrders.map((ord) => {
                    const grandTotal = Number(ord.estimatedPrice || 0) + Number(ord.extraCharge || 0);
                    return (
                      <tr key={ord._id}>
                        <td><strong>#{ord.pickupCode}</strong></td>
                        <td>{new Date(ord.createdAt).toLocaleDateString()}</td>
                        <td>
                          <ul className="doc-list-compact">
                            {(ord.documents || []).map((d, idx) => (
                              <li key={idx}>
                                <strong>{d.docTitle}</strong> ({d.pages || 1} pg × {d.copies} copy, {d.printType}, {d.sides})
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td>
                          <div>Base: ₹{ord.estimatedPrice}</div>
                          {ord.extraCharge > 0 && (
                            <div className="extra-charge-tag">
                              +₹{ord.extraCharge} ({ord.extraChargeReason})
                            </div>
                          )}
                          <div><strong>Total: ₹{grandTotal}</strong></div>
                        </td>
                        <td>{ord.status}</td>
                        <td><span className="badge badge-paid">Paid</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentHistoryView;