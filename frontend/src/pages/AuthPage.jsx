import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { COURSES_LIST } from '../constants/courses.js';

function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('student');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: COURSES_LIST[0],
    shopName: '',
    shopAddress: '',
  });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await api.post(endpoint, { ...form, role });
      localStorage.setItem('pq_token', res.data.token);
      localStorage.setItem('pq_user', JSON.stringify(res.data.user));

      if (res.data.user.role === 'shopkeeper') {
        navigate('/shop');
      } else {
        navigate('/');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-sm">
      <div className="card">
        <h1 className="page-title">{isRegister ? 'Create an Account' : 'Welcome Back'}</h1>
        <p className="page-subtitle">
          {isRegister ? 'Select your role to get started' : 'Sign in to access your dashboard'}
        </p>

        {errorMsg && <div className="toast-error">{errorMsg}</div>}

        {isRegister && (
          <div className="role-tabs">
            <button
              type="button"
              className={`role-tab ${role === 'student' ? 'active' : ''}`}
              onClick={() => setRole('student')}
            >
              Student
            </button>
            <button
              type="button"
              className={`role-tab ${role === 'shopkeeper' ? 'active' : ''}`}
              onClick={() => setRole('shopkeeper')}
            >
              Shopkeeper
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-group">
          {isRegister && (
            <>
              <input
                required
                placeholder="Full Name"
                className="input-box"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                required
                placeholder="Mobile Number"
                className="input-box"
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />

              {role === 'student' && (
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

              {role === 'shopkeeper' && (
                <>
                  <input
                    required
                    placeholder="Shop Name (e.g. Campus Print Hub)"
                    className="input-box"
                    onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  />
                  <input
                    required
                    placeholder="Shop Address (e.g. Gate 1, University Road)"
                    className="input-box"
                    onChange={(e) => setForm({ ...form, shopAddress: e.target.value })}
                  />
                </>
              )}
            </>
          )}

          <input
            required
            type="email"
            placeholder="Email Address"
            className="input-box"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            type="password"
            placeholder="Password"
            className="input-box"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : (isRegister ? 'Register' : 'Sign In')}
          </button>
        </form>

        <p className="page-subtitle auth-switch-text">
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
            }}
            className="link-toggle"
          >
            {isRegister ? 'Sign In' : 'Register'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;