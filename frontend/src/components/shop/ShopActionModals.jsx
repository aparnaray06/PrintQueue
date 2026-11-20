import React, { useState, useEffect } from 'react';

function ShopActionModals({
  fineOrder,
  onCloseFine,
  onSaveFine,
  issueOrder,
  onCloseIssue,
  onSaveIssue,
}) {
  const [fineAmount, setFineAmount] = useState('');
  const [fineReason, setFineReason] = useState('');
  const [issueReason, setIssueReason] = useState(
    'Google Drive link is private — please enable public view access'
  );

  useEffect(() => {
    if (fineOrder) {
      setFineAmount(fineOrder.extraCharge || '');
      setFineReason(fineOrder.extraChargeReason || 'Paper & ink rate adjustment / heavy coverage');
    }
  }, [fineOrder]);

  const handleFineSubmit = (e) => {
    e.preventDefault();
    onSaveFine(fineOrder._id, fineOrder.pickupCode, Number(fineAmount), fineReason);
  };

  const handleIssueSubmit = (e) => {
    e.preventDefault();
    onSaveIssue(issueOrder._id, issueOrder.pickupCode, issueReason);
  };

  return (
    <>
      {fineOrder && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2 className="page-title">Add / Edit Extra Charge — #{fineOrder.pickupCode}</h2>
                <p className="page-subtitle">Student: {fineOrder.studentName} ({fineOrder.studentDepartment})</p>
              </div>
              <button onClick={onCloseFine} className="btn-close-modal">Close</button>
            </div>

            <form onSubmit={handleFineSubmit} className="form-group">
              <div>
                <label className="field-label">Extra Charge Amount (₹)</label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="e.g. 15"
                  className="input-box"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="field-label">Reason (Ink/Paper Rate Change, Heavy Print, or Late Pickup)</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. High ink coverage / paper rate adjustment"
                  className="input-box"
                  value={fineReason}
                  onChange={(e) => setFineReason(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary">
                Save Extra Charge
              </button>
            </form>
          </div>
        </div>
      )}

      {issueOrder && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <h2 className="page-title">Flag File Issue — #{issueOrder.pickupCode}</h2>
                <p className="page-subtitle">Notify {issueOrder.studentName} to fix their PDF link</p>
              </div>
              <button onClick={onCloseIssue} className="btn-close-modal">Close</button>
            </div>

            <form onSubmit={handleIssueSubmit} className="form-group">
              <div>
                <label className="field-label">Issue Reason</label>
                <input
                  required
                  type="text"
                  className="input-box"
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary">
                Send File Issue Notice
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ShopActionModals;