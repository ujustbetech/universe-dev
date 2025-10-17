import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig'; 
import styles from '../../src/app/styles/AdminLogin.module.css';

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
      router.push('/admin/event/addEvent'); // Redirect to the Admin Panel after successful login
    } catch (err) {
      setError('Invalid email or password');
      console.error('Error logging in:', err);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      <form onSubmit={handleLogin} className={styles.loginForm}>
        {/* <h2>Admin Login</h2> */}
        {error && <p className={styles.errorMessage}>{error}</p>}
        <div className={styles.inputGroup}>
          <label htmlFor="email">Email:<sup>*</sup></label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label htmlFor="password">Password:<sup>*</sup></label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="m-button-7">Login</button>
      </form>
    </div>
  );
};

export default AdminLogin;
