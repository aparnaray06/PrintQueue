import React, { useState } from 'react';
import { COURSES_LIST } from '../../constants/courses.js';

function DepartmentLedgersTab({ deptGroups, selectedYear, onYearChange, onSelectStudent }) {
  const [selectedDept, setSelectedDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const allDepartments = Array.from(
    new Set([...COURSES_LIST, ...deptGroups.map((g) => g.department)])
  );

  const visibleDeptGroups = deptGroups
    .filter((g) => selectedDept === 'All' || g.department === selectedDept)
    .map((g) => ({
      ...g,
      students: g.students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.phone.includes(searchQuery)
      ),
    }))
    .filter((g) => g.students.length > 0);

  return (
    <div>
      <div className="dept-controls-bar">
        <select
          className="dept-select-box"
          value={selectedYear}
          onChange={(e) => onYearChange(e.target.value)}
        >
          <option value="2026-27">Academic Year: 2026-27 (Current)</option>
          <option value="2025-26">Academic Year: 2025-26 (Archived)</option>
          <option value="All">All Academic Years</option>
        </select>

        <select
          className="dept-select-box"
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
        >
          <option value="All">All Departments ({allDepartments.length})</option>
          {allDepartments.map((deptName) => {
            const foundGroup = deptGroups.find((g) => g.department === deptName);
            const count = foundGroup ? foundGroup.studentCount : 0;
            return (
              <option key={deptName} value={deptName}>
                {deptName} ({count} {count === 1 ? 'Student' : 'Students'})
              </option>
            );
          })}
        </select>

        <input
          type="text"
          placeholder="Search student by name or phone..."
          className="dept-search-box"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {visibleDeptGroups.length === 0 ? (
        <p className="page-subtitle">
          {selectedDept === 'All'
            ? 'No students registered yet.'
            : `No students registered under ${selectedDept} yet.`}
        </p>
      ) : (
        visibleDeptGroups.map((group) => {
          const unpaidStudents = group.students.filter((s) => s.unpaidAmount > 0);
          const paidStudents = group.students.filter((s) => s.paidAmount > 0 || s.unpaidAmount === 0);

          return (
            <div key={group.department} className="dept-section-card">
              <div className="dept-section-header">
                <span className="dept-section-title">{group.department}</span>
                <div className="dept-metrics">
                  <span className="metric-chip">Students: {group.studentCount}</span>
                  <span className="metric-chip">Copies: {group.totalCopies}</span>
                  <span className="metric-chip">Unpaid Due: ₹{group.totalPending}</span>
                  <span className="metric-chip">Paid Total: ₹{group.totalPaid}</span>
                </div>
              </div>

              <div className="dept-split-grid">
                <div className="ledger-box-unpaid">
                  <div className="ledger-box-header-unpaid">
                    <span>Unpaid / Pending Ledger ({unpaidStudents.length})</span>
                    <span>₹{group.totalPending}</span>
                  </div>
                  {unpaidStudents.length === 0 ? (
                    <p className="ledger-empty-note">No unpaid dues in this department.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="order-table">
                        <thead>
                          <tr>
                            <th>Student (Click for History)</th>
                            <th>Unpaid Orders</th>
                            <th>Due Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unpaidStudents.map((s) => {
                            const unpaidCount = s.orders.filter((o) => o.paymentStatus !== 'Paid').length;
                            return (
                              <tr
                                key={s._id}
                                className="clickable-row"
                                onClick={() => onSelectStudent(s._id)}
                              >
                                <td>
                                  <span className="student-link-name">{s.name}</span>
                                  <div><small>{s.phone}</small></div>
                                </td>
                                <td>{unpaidCount} pending</td>
                                <td><span className="badge badge-unpaid">₹{s.unpaidAmount}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="ledger-box-paid">
                  <div className="ledger-box-header-paid">
                    <span>Paid / Settled Ledger ({paidStudents.length})</span>
                    <span>₹{group.totalPaid}</span>
                  </div>
                  {paidStudents.length === 0 ? (
                    <p className="ledger-empty-note">No paid records in this department yet.</p>
                  ) : (
                    <div className="table-wrapper">
                      <table className="order-table">
                        <thead>
                          <tr>
                            <th>Student (Click for History)</th>
                            <th>Paid Orders</th>
                            <th>Paid Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paidStudents.map((s) => {
                            const paidCount = s.orders.filter((o) => o.paymentStatus === 'Paid').length;
                            return (
                              <tr
                                key={s._id}
                                className="clickable-row"
                                onClick={() => onSelectStudent(s._id)}
                              >
                                <td>
                                  <span className="student-link-name">{s.name}</span>
                                  <div><small>{s.phone}</small></div>
                                </td>
                                <td>{paidCount} settled</td>
                                <td><span className="badge badge-paid">₹{s.paidAmount}</span></td>
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
        })
      )}
    </div>
  );
}

export default DepartmentLedgersTab;