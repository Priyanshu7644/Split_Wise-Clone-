import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, User, Lock, Activity } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login');
    }
  };

  return (
    <div className="container flex justify-center items-center" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="glass-panel flex" style={{ maxWidth: '900px', width: '100%', overflow: 'hidden', minHeight: '500px' }}>
        
        {/* Left Side Branding */}
        <div style={{ flex: 1, background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--success-color) 100%)', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'white' }} className="hide-on-mobile">
          <Activity size={64} style={{ marginBottom: '1.5rem', opacity: 0.9 }} />
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1.1 }}>Fair Split.</h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
            Keep track of your shared expenses and balances with housemates, trips, groups, friends, and family.
          </p>
        </div>

        {/* Right Side Form */}
        <div style={{ flex: 1, padding: '3rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2>Welcome Back</h2>
            <p className="text-muted">Enter your credentials to access your account.</p>
          </div>
          
          {error && <div className="text-danger" style={{ marginBottom: '1rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="email" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="name@example.com"
                  required 
                />
              </div>
            </div>
            
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="password" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required 
                />
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}>
              <LogIn size={18} /> Log In
            </button>
          </form>
          
          <p style={{ textAlign: 'center', marginTop: '2rem' }}>
            <span className="text-muted">Don't have an account? </span>
            <Link to="/register" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
