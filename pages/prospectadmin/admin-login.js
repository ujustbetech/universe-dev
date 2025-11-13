import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig'; 
import "../../src/app/styles/main.scss";

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Sign in with Firebase Authentication
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/admin/event/create-event'); // Redirect to the Admin Panel after successful login
    } catch (err) {
      setError('Invalid email or password');
      console.error('Error logging in:', err);
    }
  };

  return (
 
    <div className="login-wrapper">
     
    <form onSubmit={handleLogin}  className="login-form">
    <h2>Admin Login</h2>
    <div className="input-group">
  
    <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
      </div>
      <div className="input-group">
 
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      </div>
      <div className="input-group">
      <button type="submit" className="login-button">Login</button>
      </div>
    </form>
  </div>
  );
};

export default AdminLogin;
