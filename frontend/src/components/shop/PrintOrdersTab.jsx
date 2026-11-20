import React, { useState } from 'react';

function PrintOrdersTab({
  queueOrders,
  onUpdateStatus,
  onOpenFineModal,
  onOpenIssueModal,
  onMarkPaid,
}) {
  const [orderSearch, setOrderSearch] = useState('');

  const getMinutesSinceReady = (readyAt) => {
    if (!readyAt) return 0;
    return Math.floor((Date.now() - new Date(readyAt).getTime()) / 60000);
  };

  const getBadgeClass = (status) => {
    if (status === 'Ready') return 'badge badge-ready';
    if (status === 'Printing') return 'badge badge-printing';
    return 'badge badge-pending';
  };

  const filteredOrders = queueOrders.filter((o) => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      o.pickupCode.toLowerCase().includes(q) ||
      o.studentName.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="order-toolbar">
        <input
          type="text"
          placeholder="Search by 3-digit pickup code (e.g. 482) or student name..."
          className="code-search-input"
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
        />
        {orderSearch && (
          <button onClick={() => setOrderSearch('')} className="btn-sm btn-done">
            Clear Search
          </button>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <p className="page-subtitle">No active orders in the print queue.</p>
      ) : (
        <div className="table-wrapper">
          <table className="order-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Student & Course</th>
                <th>Documents & Pages</th>
                <th>Total Bill</th>
                <th>Print Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((o) => {
                const minsReady = o.status === 'Ready' ? getMinutesSinceReady(o.readyAt) : 0;
                const isOverdue = o.status === 'Ready' && minsReady >= 15;
                const grandTotal = Number(o.estimatedPrice || 0) + Number(o.extraCharge || 0);

                return (
                  <tr key={o._id}>
                    <td><strong>#{o.pickupCode}</strong></td>
                    <td>
                      <div>{o.studentName} <span className="dept-tag">{o.studentDepartment}</span></div>
                      <small>{o.studentPhone}</small>
                    </td>
                    <td>
                      <ul className="doc-list-compact">
                        {(o.documents && o.documents.length > 0
                          ? o.documents
                          : [{ docTitle: 'Document', fileLink: o.fileLink, pages: 1, copies: o.copies, printType: o.printType, sides: o.sides }]
                        ).map((d, i) => (
                          <li key={i}>
                            <strong>{d.docTitle}</strong> ({d.pages || 1} pg × {d.copies} copy, {d.printType}, {d.sides}) —{' '}
                            <a href={d.fileLink} target="_blank" rel="noreferrer" className="file-link">
                              Open PDF ↗
                            </a>
                          </li>
                        ))}
                      </ul>
                      {o.notes && <small>Note: {o.notes}</small>}
                    </td>
                    <td>
                      <div>Base: <strong>₹{o.estimatedPrice}</strong> ({o.totalPages || o.totalCopies || 1} pgs)</div>
                      {o.extraCharge > 0 && (
                        <div className="extra-charge-tag">
                          <strong>Extra Charge: +₹{o.extraCharge}</strong>
                          <div>Reason: {o.extraChargeReason}</div>
                        </div>
                      )}
                      <div><strong>Total: ₹{grandTotal}</strong></div>
                    </td>
                    <td>
                      <div><span className={getBadgeClass(o.status)}>{o.status}</span></div>
                      {o.status === 'Ready' && (
                        <div className={isOverdue ? 'delay-warning-pill' : 'ready-timer-pill'}>
                          {isOverdue ? `Overdue (${minsReady}m uncollected)` : `Ready ${minsReady}m ago`}
                        </div>
                      )}
                      {o.status === 'File Issue' && o.rejectionReason && (
                        <div className="extra-charge-tag">{o.rejectionReason}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${o.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div className="action-group">
                        <button onClick={() => onUpdateStatus(o._id, 'Printing')} className="btn-sm btn-warn">Printing</button>
                        <button onClick={() => onUpdateStatus(o._id, 'Ready')} className="btn-sm btn-success">Ready</button>
                        <button onClick={() => onUpdateStatus(o._id, 'Completed')} className="btn-sm btn-done">Picked Up</button>
                        <button onClick={() => onOpenIssueModal(o)} className="btn-fine">File Issue</button>
                        <button onClick={() => onOpenFineModal(o)} className="btn-fine">
                          {o.extraCharge > 0 ? 'Edit Charge' : '+ Extra Charge'}
                        </button>
                        {o.paymentStatus !== 'Paid' && (
                          <button onClick={() => onMarkPaid(o._id)} className="btn-pay">
                            Mark Paid (₹{grandTotal})
                          </button>
                        )}
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
  );
}

export default PrintOrdersTab;