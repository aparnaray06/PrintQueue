import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api.js';

const createEmptyDoc = () => ({
  docTitle: '',
  fileLink: '',
  pages: 1,
  copies: 1,
  printType: 'B&W',
  sides: 'Single-Sided',
});

function StudentOrderPage() {
  const user = JSON.parse(localStorage.getItem('pq_user') || 'null');
  const [shopInfo, setShopInfo] = useState({
    shopName: 'Campus Print Shop',
    shopAddress: 'Main Gate',
    bwRate: 2,
    doubleSidedRate: 3,
    colorRate: 10,
    shopOpen: true,
  });

  const [documents, setDocuments] = useState([createEmptyDoc()]);
  const [notes, setNotes] = useState('');
  const [createdOrder, setCreatedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    api.get('/auth/shop-info').then((res) => setShopInfo(res.data));
  }, []);

  if (!user) return <Navigate to="/auth" replace />;
  if (user.role === 'shopkeeper') return <Navigate to="/shop" replace />;

  const handleDocChange = (index, field, value) => {
    setDocuments((prev) =>
      prev.map((doc, i) => (i === index ? { ...doc, [field]: value } : doc))
    );
  };

  const addDocument = () => {
    setDocuments((prev) => [...prev, createEmptyDoc()]);
  };

  const removeDocument = (index) => {
    if (documents.length === 1) return;
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const totalEstimatedPrice = documents.reduce((sum, doc) => {
    const pages = Math.max(1, Number(doc.pages || 1));
    const copies = Math.max(1, Number(doc.copies || 1));
    const isDouble = doc.sides === 'Double-Sided';
    const effectiveSheets = isDouble ? Math.ceil(pages / 2) : pages;
    const rate =
      doc.printType === 'Color'
        ? shopInfo.colorRate
        : isDouble
        ? shopInfo.doubleSidedRate || 3
        : shopInfo.bwRate;

    return sum + rate * effectiveSheets * copies;
  }, 0);

  const totalPagesCount = documents.reduce(
    (sum, doc) => sum + Math.max(1, Number(doc.pages || 1)) * Math.max(1, Number(doc.copies || 1)),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/orders', { documents, notes });
      setCreatedOrder(res.data);
      setDocuments([createEmptyDoc()]);
      setNotes('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit print request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-md">
      <div className="card">
        <h1 className="page-title">Submit Printout Request</h1>
        <p className="page-subtitle">
          Student: <strong>{user.name}</strong> ({user.department}) | {user.phone}
        </p>

        {shopInfo.shopOpen === false && (
          <div className="toast-error">
            Print Shop Temporarily Paused: The counter is currently on a break or maintenance. New orders cannot be placed until it reopens.
          </div>
        )}

        <div className="shop-banner">
          <strong>{shopInfo.shopName}</strong> — {shopInfo.shopAddress} <br />
          Rates: <strong>₹{shopInfo.bwRate}/sheet (Single B&W)</strong> |{' '}
          <strong>₹{shopInfo.doubleSidedRate || 3}/sheet (Double-Sided B&W)</strong> |{' '}
          <strong>₹{shopInfo.colorRate}/sheet (Color)</strong>
        </div>

        {errorMsg && <div className="toast-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="form-group">
          {documents.map((doc, idx) => {
            const isDriveLink = doc.fileLink.toLowerCase().includes('drive.google.com');
            return (
              <div key={idx} className="doc-item-card">
                <div className="doc-item-header">
                  <span className="doc-item-title">Document #{idx + 1}</span>
                  {documents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDocument(idx)}
                      className="btn-remove-doc"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div>
                  <label className="field-label">Document Name / Label</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g., Operating Systems Lab File"
                    className="input-box"
                    value={doc.docTitle}
                    onChange={(e) => handleDocChange(idx, 'docTitle', e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">PDF / Document Link (Google Drive / Cloud URL)</label>
                  <input
                    required
                    type="url"
                    placeholder="https://drive.google.com/file/d/..."
                    className="input-box"
                    value={doc.fileLink}
                    onChange={(e) => handleDocChange(idx, 'fileLink', e.target.value)}
                  />
                  {isDriveLink && (
                    <small className="drive-hint-text">
                      Reminder: Set Google Drive link sharing to &quot;Anyone with the link can view&quot; so the shopkeeper can open it immediately.
                    </small>
                  )}
                </div>

                <div className="form-row-4">
                  <div>
                    <label className="field-label">Pages in PDF</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      required
                      className="input-box"
                      value={doc.pages}
                      onChange={(e) => handleDocChange(idx, 'pages', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="field-label">Copies</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      required
                      className="input-box"
                      value={doc.copies}
                      onChange={(e) => handleDocChange(idx, 'copies', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="field-label">Color Mode</label>
                    <select
                      className="input-box"
                      value={doc.printType}
                      onChange={(e) => handleDocChange(idx, 'printType', e.target.value)}
                    >
                      <option value="B&W">B&W</option>
                      <option value="Color">Color (₹{shopInfo.colorRate}/sheet)</option>
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Print Sides</label>
                    <select
                      className="input-box"
                      value={doc.sides}
                      onChange={(e) => handleDocChange(idx, 'sides', e.target.value)}
                    >
                      <option value="Single-Sided">Single-Sided (₹{shopInfo.bwRate})</option>
                      <option value="Double-Sided">Double-Sided (₹{shopInfo.doubleSidedRate || 3})</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })}

          <button type="button" onClick={addDocument} className="btn-add-doc">
            + Add Another Document to This Order
          </button>

          <div>
            <label className="field-label">Binding / Counter Instructions (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Spiral bind all files together, print pages 1-12 only"
              className="input-box"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || shopInfo.shopOpen === false}
          >
            {loading
              ? 'Generating Pickup Code...'
              : `Submit ${documents.length} Document(s) • ${totalPagesCount} Total Pages • ₹${totalEstimatedPrice}`}
          </button>
        </form>

        {createdOrder && (
          <div className="ticket-box">
            <p>Show this 3-digit pickup code at the counter to collect your printouts:</p>
            <div className="pickup-code-display">#{createdOrder.pickupCode}</div>
            <p>
              <strong>Documents:</strong> {createdOrder.documents?.length} |{' '}
              <strong>Total Pages:</strong> {createdOrder.totalPages} |{' '}
              <strong>Estimated Bill:</strong> ₹{createdOrder.estimatedPrice}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentOrderPage;