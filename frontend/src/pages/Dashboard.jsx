import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Users, LogOut, Trash2, Search, UserPlus, X } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [addedRoommates, setAddedRoommates] = useState([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        try {
          setIsSearching(true);
          const res = await axios.get(`/api/users/search?q=${searchQuery}`);
          // Filter out the current user and already added roommates from suggestions
          const filtered = res.data.filter(u => 
            u.id !== user.id && !addedRoommates.some(r => r.id === u.id)
          );
          setSearchResults(filtered);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, addedRoommates, user.id]);

  const fetchGroups = async () => {
    const res = await axios.get('/api/groups');
    setGroups(res.data);
  };

  const handleSelectRoommate = (selectedUser) => {
    setAddedRoommates(prev => [...prev, selectedUser]);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
  };

  const removeRoommate = (id) => {
    setAddedRoommates(prev => prev.filter(r => r.id !== id));
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    await axios.post('/api/groups', {
      name: newGroupName,
      members: addedRoommates.map(r => r.id)
    });
    closeModal();
    fetchGroups();
  };

  const handleDeleteGroup = async (e, id) => {
    e.preventDefault();
    if(window.confirm('Are you sure you want to delete this group? All expenses and settlements will be permanently lost.')) {
      await axios.delete(`/api/groups/${id}`);
      fetchGroups();
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setAddedRoommates([]);
    setNewGroupName('');
  };

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
      <header className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted">
            Welcome back, {user?.name} 
            <span style={{ background: 'var(--surface-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
              Your UID: {user?.id}
            </span>
          </p>
        </div>
        <button className="btn btn-outline" onClick={logout}>
          <LogOut size={18} /> Logout
        </button>
      </header>

      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
        <h2>Your Groups</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Users size={48} className="text-muted" style={{ marginBottom: '1rem' }} />
          <h3 className="text-muted">No groups yet</h3>
          <p className="text-muted">Create a group to start splitting expenses with roommates.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {groups.map(group => (
            <Link to={`/groups/${group.id}`} key={group.id} style={{ textDecoration: 'none' }}>
              <div className="glass-card flex justify-between items-center">
                <div>
                  <h3>{group.name}</h3>
                  <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                    Created on {new Date(group.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  className="btn btn-outline text-danger" 
                  style={{ padding: '0.5rem', border: 'none' }}
                  onClick={(e) => handleDeleteGroup(e, group.id)}
                  title="Delete Group"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ padding: '2rem', overflow: 'visible', position: 'relative' }}>
            
            {/* Close Button 'X' */}
            <button 
              onClick={closeModal} 
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>

            <h2>Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">Group Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newGroupName} 
                  onChange={e => setNewGroupName(e.target.value)} 
                  placeholder="e.g., Apartment 4B"
                  required 
                />
              </div>
              
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Add Roommate by UID or Contact Number</label>
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ paddingLeft: '2.5rem' }}
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    placeholder="Type UID or Contact Number..."
                    autoComplete="off"
                  />
                </div>
                
                {/* Autocomplete Dropdown */}
                {searchQuery.trim().length > 0 && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    marginTop: '0.5rem', 
                    zIndex: 9999, 
                    padding: '0.5rem', 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    background: '#1e293b', // Solid color to prevent overlap visibility
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                  }}>
                    {isSearching ? (
                      <div className="text-muted" style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem' }}>Searching...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map(resUser => (
                        <div 
                          key={resUser.id} 
                          className="flex justify-between items-center" 
                          style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          onClick={() => handleSelectRoommate(resUser)}
                        >
                          <div>
                            <div style={{ fontWeight: 500 }}>{resUser.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>UID: {resUser.id} {resUser.contact_number ? `• ${resUser.contact_number}` : ''}</div>
                          </div>
                          <UserPlus size={18} className="text-primary" />
                        </div>
                      ))
                    ) : (
                      <div className="text-muted" style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem' }}>No users found matching "{searchQuery}"</div>
                    )}
                  </div>
                )}
              </div>

              {addedRoommates.length > 0 && (
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">Added Roommates</label>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(15,23,42,0.4)', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
                    {addedRoommates.map(r => (
                      <div key={r.id} className="flex justify-between items-center" style={{ padding: '0.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                        <div>
                          <div style={{ fontWeight: 500 }}>{r.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.8rem' }}>UID: {r.id}</div>
                        </div>
                        <button type="button" className="btn btn-outline text-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => removeRoommate(r.id)}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
