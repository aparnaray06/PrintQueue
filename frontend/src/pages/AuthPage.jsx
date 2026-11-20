import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { COURSES_LIST } from '../constants/courses.js';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('student');
  const [shopsList, setShopsList] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    department: COURSES_LIST[0],
    shopEmail: '',
    shopName: '',
    shopAddress: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/shops').then((res) => {
      setShopsList(res.data);
      if (res.data.length > 0 && !form.shopEmail) {
        setForm((prev) => ({ ...prev, shopEmail: res.data[0].email }));
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? { email: form.email, password: form.password } : { ...form, role };
      const res = await api.post(endpoint, payload);

      localStorage.setItem('pq_token', res.data.token);
      localStorage.setItem('pq_user', JSON.stringify(res.data.user));

      if (res.data.user.role === 'shopkeeper') {
        navigate('/shop');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed.');
    }
  };

  return (
    <div className="container-sm">
      <div className="card">
        <h2 className="page-title">{isLogin ? 'Welcome Back to PrintQueue' : 'Create Account'}</h2>
        <p className="page-subtitle">
          {isLogin ? 'Sign in to submit or manage printouts' : 'Select your role to get started'}
        </p>

        {!isLogin && (
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
              Print Shopkeeper
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-group">
          {!isLogin && (
            <>
              <input
                required
                placeholder="Full Name"
                className="input-box"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                required
                placeholder="Phone Number"
                className="input-box"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />

              {role === 'student' && (
                <>
                  <div>
                    <label className="field-label">Course / Department</label>
                    <select
                      className="input-box"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    >
                      {COURSES_LIST.map((course) => (
                        <option key={course} value={course}>
                          {course}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Your College Print Shopkeeper Email</label>
                    {shopsList.length > 0 && (
                      <select
                        className="input-box"
                        value={form.shopEmail}
                        onChange={(e) => setForm({ ...form, shopEmail: e.target.value })}
                      >
                        {shopsList.map((s) => (
                          <option key={s._id} value={s.email}>
                            {s.shopName} ({s.email}) — {s.shopAddress}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      required
                      type="email"
                      placeholder="Or type shopkeeper email (e.g. printshop@college.edu)"
                      className="input-box"
                      value={form.shopEmail}
                      onChange={(e) => setForm({ ...form, shopEmail: e.target.value })}
                    />
                  </div>
                </>
              )}

              {role === 'shopkeeper' && (
                <>
                  <input
                    required
                    placeholder="Print Shop Name (e.g., IITD Main Gate Print Shop)"
                    className="input-box"
                    value={form.shopName}
                    onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  />
                  <input
                    required
                    placeholder="College / Campus Location"
                    className="input-box"
                    value={form.shopAddress}
                    onChange={(e) => setForm({ ...form, shopAddress: e.target.value })}
                  />
                </>
              )}
            </>
          )}

          <input
            required
            type="email"
            placeholder={role === 'shopkeeper' && !isLogin ? 'Shopkeeper Official Email' : 'Email Address'}
            className="input-box"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            type="password"
            placeholder="Password"
            className="input-box"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-primary">
            {isLogin ? 'Login' : `Register as ${role === 'student' ? 'Student' : 'Shopkeeper'}`}
          </button>
        </form>

        <p className="page-subtitle auth-switch-text">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span className="link-toggle" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register here' : 'Login here'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;