'use client';

import { useEffect, useState } from 'react';
import { db } from '../../firebaseConfig';
import { COLLECTIONS } from '/utility_collection';
import {
  collection,
  getDocs,
  addDoc,
  getDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';

export default function CreateDoorstepEventPage() {

  /* ================= USERS ================= */
  const [users, setUsers] = useState([]);

  /* ================= FORM ================= */
  const [form, setForm] = useState({
    eventName: '',
    startDate: '',
    initiationDate: '',
    leader: '', // UJB CODE
    leaderRole: '',
    ntRoles: '',
    prospects: []
  });

  /* ================= NT MEMBERS (OBJECTS) ================= */
  const [ntMembers, setNtMembers] = useState([]);
  const [ntSearch, setNtSearch] = useState('');
  const [filteredNt, setFilteredNt] = useState([]);

  /* ================= LEADER SEARCH ================= */
  const [leaderSearch, setLeaderSearch] = useState('');
  const [filteredLeaders, setFilteredLeaders] = useState([]);
  const [focusedInput, setFocusedInput] = useState(null);

  /* ================= PROSPECT FORM ================= */
  const [prospectForm, setProspectForm] = useState({
    name: '',
    phone: '',
    email: ''
  });

  /* ================= FETCH USERS ================= */
  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, COLLECTIONS.userDetail));
      const list = snap.docs.map(d => ({
        id: d.id,
        name: d.data()?.Name,
        phone: d.data()?.MobileNo,
        email: d.data()?.Email || ''
      }));
      setUsers(list);
      setFilteredLeaders(list);
      setFilteredNt(list);
    };
    fetchUsers();
  }, []);

  /* ================= SEARCH HELPERS ================= */
  const handleLeaderSearch = (value) => {
    setLeaderSearch(value);
    setFilteredLeaders(
      users.filter(u =>
        u.name?.toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  const handleNtSearch = (value) => {
    setNtSearch(value);
    setFilteredNt(
      users.filter(u =>
        u.name?.toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  /* ================= NT MEMBERS ================= */
  const addNtMember = (user) => {
    if (ntMembers.some(n => n.phone === user.phone)) return;

    setNtMembers(prev => [...prev, { name: user.name, phone: user.phone }]);
    setNtSearch('');
    setFilteredNt([]);
  };

  const removeNtMember = (phone) => {
    setNtMembers(prev => prev.filter(n => n.phone !== phone));
  };

  /* ================= PROSPECTS ================= */
  const addProspect = () => {
    if (!prospectForm.name || !prospectForm.phone || !prospectForm.email) {
      alert('All prospect fields are required');
      return;
    }

    if (form.prospects.some(p => p.phone === prospectForm.phone)) {
      alert('Prospect with this phone already added');
      return;
    }

    setForm(prev => ({
      ...prev,
      prospects: [...prev.prospects, prospectForm]
    }));

    setProspectForm({ name: '', phone: '', email: '' });
  };

  const removeProspect = (phone) => {
    setForm(prev => ({
      ...prev,
      prospects: prev.prospects.filter(p => p.phone !== phone)
    }));
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const leaderSnap = await getDoc(
        doc(db, COLLECTIONS.userDetail, form.leader)
      );

      if (!leaderSnap.exists()) {
        alert('Leader not found');
        return;
      }

      const leaderPhone = leaderSnap.data()?.MobileNo;
      const leaderName = leaderSnap.data()?.Name;

      const orbitersArray = form.prospects.map(p => ({
        name: p.name,
        phone: p.phone,
        email: p.email
      }));

      await addDoc(collection(db, 'Doorstep'), {
        doorstepStream: form.eventName,

        startDate: form.startDate,
        initiationDate: form.initiationDate,

        leader: leaderPhone,
        leaderName: leaderName,
        leaderRole: form.leaderRole,

        ntMembers: ntMembers,
        ntRoles: form.ntRoles,

        orbiters: orbitersArray,

        updatedAt: serverTimestamp(),
      });

      alert('Doorstep Event Created Successfully');

      setForm({
        eventName: '',
        startDate: '',
        initiationDate: '',
        leader: '',
        leaderRole: '',
        ntRoles: '',
        prospects: []
      });
      setLeaderSearch('');
      setNtMembers([]);

    } catch (err) {
      console.error(err);
      alert('Something went wrong');
    }
  };

  /* ================= UI ================= */
  return (
    <section className="c-form box">
      <h2>Create Doorstep Event</h2>

      <form onSubmit={handleSubmit}>

        <input
          placeholder="Doorstep Stream"
          value={form.eventName}
          onChange={e => setForm({ ...form, eventName: e.target.value })}
          required
        />

        <input
          type="date"
          value={form.startDate}
          onChange={e => setForm({ ...form, startDate: e.target.value })}
          required
        />

        <input
          type="date"
          value={form.initiationDate}
          onChange={e => setForm({ ...form, initiationDate: e.target.value })}
          required
        />

        {/* Leader */}
        <div className="autosuggest">
          <input
            placeholder="Search Leader"
            value={leaderSearch}
            onChange={(e) => handleLeaderSearch(e.target.value)}
            onFocus={() => setFocusedInput('leader')}
            required
          />

          {focusedInput === 'leader' && (
            <ul className="dropdown">
              {filteredLeaders.map(user => (
                <li
                  key={user.id}
                  onClick={() => {
                    setForm(prev => ({ ...prev, leader: user.id }));
                    setLeaderSearch(user.name);
                    setFocusedInput(null);
                  }}
                >
                  {user.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* NT MEMBERS */}
        <h4>Add NT Members (Optional)</h4>

        <div className="autosuggest">
          <input
            placeholder="Search NT Member"
            value={ntSearch}
            onChange={(e) => handleNtSearch(e.target.value)}
            onFocus={() => setFocusedInput('nt')}
          />

          {focusedInput === 'nt' && (
            <ul className="dropdown">
              {filteredNt.map(user => (
                <li key={user.id} onClick={() => addNtMember(user)}>
                  {user.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="selected-tags">
          {ntMembers.map(n => (
            <span key={n.phone} onClick={() => removeNtMember(n.phone)}>
              {n.name} ({n.phone}) ✕
            </span>
          ))}
        </div>

        {/* Prospects */}
        <h4>Add Prospects</h4>

        <input
          placeholder="Prospect Name"
          value={prospectForm.name}
          onChange={e => setProspectForm({ ...prospectForm, name: e.target.value })}
        />

        <input
          placeholder="Prospect Phone"
          value={prospectForm.phone}
          onChange={e => setProspectForm({ ...prospectForm, phone: e.target.value })}
        />

        <input
          placeholder="Prospect Email"
          value={prospectForm.email}
          onChange={e => setProspectForm({ ...prospectForm, email: e.target.value })}
        />

        <button type="button" onClick={addProspect}>
          Add Prospect
        </button>

        {form.prospects.map(p => (
          <p key={p.phone}>
            {p.name} ({p.phone}) ✕
            <span onClick={() => removeProspect(p.phone)}> Remove</span>
          </p>
        ))}

        <textarea
          placeholder="Leader Role & Responsibility"
          value={form.leaderRole}
          onChange={e => setForm({ ...form, leaderRole: e.target.value })}
          required
        />

        <textarea
          placeholder="NT Roles & Responsibilities"
          value={form.ntRoles}
          onChange={e => setForm({ ...form, ntRoles: e.target.value })}
          required
        />

        <button type="submit" className="submitbtn">
          Create Doorstep Event
        </button>
      </form>
    </section>
  );
}
