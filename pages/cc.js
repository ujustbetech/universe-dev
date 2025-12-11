import Head from 'next/head'
import Image from 'next/image'
import Header from '../component/admin/header/Header'
import Navbar from '../component/admin/navbar/Navbar'
import LoginAdmin from '../component/admin/login/LoginAdmin'
// import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <>
      <LoginAdmin />
    </>
  )
}

