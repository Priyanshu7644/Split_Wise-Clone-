import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Mail, Phone, Lock, Activity } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(name, email, contactNumber, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register');
    }
  };

  return (
    <div className="container flex justify-center items-center" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="glass-panel flex" style={{ maxWidth: '900px', width: '100%', overflow: 'hidden', minHeight: '550px' }}>
        
        {/* Left Side Branding */}
        <div style={{ flex: 1, background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--success-color) 100%)', padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'white' }} className="hide-on-mobile">
          <Activity size={64} style={{ marginBottom: '1.5rem', opacity: 0.9 }} />
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem', lineHeight: 1.1 }}>Join Fair Split.</h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
            Create an account to start sharing expenses and tracking balances with your friends and roommates easily.
          </p>
        </div>

        {/* Right Side Form */}
        <div style={{ flex: 1, padding: '3rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2>Create Account</h2>
            <p className="text-muted">Fill in your details to get started.</p>
          </div>
          
          {error && <div className="text-danger" style={{ marginBottom: '1rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="John Doe"
                  required 
                />
              </div>
            </div>

            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
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
              <label className="form-label">Contact Number (Optional)</label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ paddingLeft: '2.5rem' }}
                  value={contactNumber} 
                  onChange={e => setContactNumber(e.target.value)} 
                  placeholder="e.g. 9701234567"
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
              <UserPlus size={18} /> Sign Up
            </button>
          </form>
          
          <p style={{ textAlign: 'center', marginTop: '2rem' }}>
            <span className="text-muted">Already have an account? </span>
            <Link to="/login" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
