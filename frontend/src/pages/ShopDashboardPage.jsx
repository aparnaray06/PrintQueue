import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api.js';
import PrintOrdersTab from '../components/shop/PrintOrdersTab.jsx';
import DepartmentLedgersTab from '../components/shop/DepartmentLedgersTab.jsx';
import StudentHistoryView from '../components/shop/StudentHistoryView.jsx';
import ShopActionModals from '../components/shop/ShopActionModals.jsx';

function ShopDashboardPage() {
  const user = JSON.parse(localStorage.getItem('pq_user') || 'null');
  const [orders, setOrders] = useState([]);
  const [deptGroups, setDeptGroups] = useState([]);
  const [selectedYear, setSelectedYear] = useState('2026-27');
  const [shopOpen, setShopOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [fineOrder, setFineOrder] = useState(null);
  const [issueOrder, setIssueOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const notify = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  const loadData = async () => {
    const [ordersRes, deptRes, shopRes] = await Promise.allSettled([
      api.get('/orders/all'),
      api.get(`/auth/students-by-department?year=${selectedYear}`),
      api.get('/auth/shop-info'),
    ]);

    if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value.data);
    if (deptRes.status === 'fulfilled') setDeptGroups(deptRes.value.data);
    if (shopRes.status === 'fulfilled') setShopOpen(shopRes.value.data.shopOpen !== false);
  };

  useEffect(() => {
    if (user?.role !== 'shopkeeper') return;
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [selectedYear]);

  if (!user || user.role !== 'shopkeeper') {
    return <Navigate to="/auth" replace />;
  }

  const handleToggleShopStatus = async () => {
    const res = await api.patch('/auth/shop-status');
    setShopOpen(res.data.shopOpen);
    notify(res.data.shopOpen ? 'Print shop is now OPEN.' : 'Print shop orders PAUSED.');
  };

  const handleUpdateStatus = async (id, status, rejectionReason = '') => {
    await api.patch(`/orders/${id}/status`, { status, rejectionReason });
    loadData();
  };

  const handleSaveFine = async (orderId, pickupCode, extraCharge, extraChargeReason) => {
    try {
      await api.patch(`/orders/${orderId}/extra-charge`, { extraCharge, extraChargeReason });
      setFineOrder(null);
      notify(`Extra charge of ₹${extraCharge} saved for Order #${pickupCode}.`);
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save extra charge.');
    }
  };

  const handleSaveIssue = async (orderId, pickupCode, reason) => {
    await handleUpdateStatus(orderId, 'File Issue', reason);
    setIssueOrder(null);
    notify(`Flagged File Issue on Order #${pickupCode}.`);
  };

  const handleMarkPaid = async (id) => {
    await api.patch(`/orders/${id}/pay`);
    notify('Order marked as Paid.');
    loadData();
  };

  const handleSettleAll = async (studentId, studentName) => {
    await api.patch(`/orders/settle-student/${studentId}`);
    notify(`All pending dues settled for ${studentName}.`);
    loadData();
  };

  const handleRecordPartial = async (studentId, amount) => {
    try {
      await api.patch(`/auth/students/${studentId}/partial-pay`, { amount });
      notify(`Partial payment of ₹${amount} recorded.`);
      loadData();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to record partial payment.');
    }
  };

  const queueOrders = orders.filter((o) => o.status !== 'Cancelled' && o.status !== 'Completed');
  const totalStudents = deptGroups.reduce((sum, g) => sum + g.studentCount, 0);
  const collectedCash = deptGroups.reduce((sum, g) => sum + Number(g.totalPaid || 0), 0);
  const pendingCash = deptGroups.reduce((sum, g) => sum + Number(g.totalPending || 0), 0);

  const activeStudent = selectedStudentId
    ? deptGroups.flatMap((g) => g.students).find((s) => s._id === selectedStudentId)
    : null;

  return (
    <div className="container-lg">
      <div className="card">
        <div className="dashboard-header no-print">
          <div>
            <h1 className="page-title">{user.shopName} — Counter Dashboard</h1>
            <p className="page-subtitle">Manage active print queue, extra charges, and department-wise ledgers</p>
          </div>
          <div className="action-group">
            <button onClick={handleToggleShopStatus} className={shopOpen ? 'btn-pay' : 'btn-fine'}>
              {shopOpen ? 'Shop Status: OPEN (Click to Pause)' : 'Shop Status: PAUSED (Click to Open)'}
            </button>
            <button onClick={loadData} className="btn-sm btn-done">Refresh Data</button>
          </div>
        </div>

        {errorMsg && <div className="toast-error no-print">{errorMsg}</div>}
        {successMsg && <div className="toast-success no-print">{successMsg}</div>}

        <div className="stats-row no-print">
          <div className="stat-card">
            <div className="field-label">Active Queue</div>
            <div className="stat-value">{queueOrders.length}</div>
          </div>
          <div className="stat-card">
            <div className="field-label">Registered Students</div>
            <div className="stat-value">{totalStudents}</div>
          </div>
          <div className="stat-card">
            <div className="field-label">Paid Ledger Total</div>
            <div className="stat-value-green">₹{collectedCash}</div>
          </div>
          <div className="stat-card">
            <div className="field-label">Unpaid Due Ledger</div>
            <div className="stat-value-red">₹{pendingCash}</div>
          </div>
        </div>

        <div className="dash-tabs no-print">
          <button
            className={`dash-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('orders');
              setSelectedStudentId(null);
            }}
          >
            Print Orders ({queueOrders.length})
          </button>
          <button
            className={`dash-tab ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('students');
              setSelectedStudentId(null);
            }}
          >
            Departments & Student Ledgers ({deptGroups.length} Active Depts)
          </button>
        </div>

        {activeTab === 'orders' ? (
          <PrintOrdersTab
            queueOrders={queueOrders}
            onUpdateStatus={handleUpdateStatus}
            onOpenFineModal={setFineOrder}
            onOpenIssueModal={setIssueOrder}
            onMarkPaid={handleMarkPaid}
          />
        ) : activeStudent ? (
          <StudentHistoryView
            student={activeStudent}
            onBack={() => setSelectedStudentId(null)}
            onSettleAll={handleSettleAll}
            onRecordPartial={handleRecordPartial}
            onOpenFineModal={setFineOrder}
            onMarkPaid={handleMarkPaid}
          />
        ) : (
          <DepartmentLedgersTab
            deptGroups={deptGroups}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            onSelectStudent={setSelectedStudentId}
          />
        )}
      </div>

      <ShopActionModals
        fineOrder={fineOrder}
        onCloseFine={() => setFineOrder(null)}
        onSaveFine={handleSaveFine}
        issueOrder={issueOrder}
        onCloseIssue={() => setIssueOrder(null)}
        onSaveIssue={handleSaveIssue}
      />
    </div>
  );
}

export default ShopDashboardPage;