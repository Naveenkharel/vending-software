import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from "../src/Components/Navbar"
import UserHome from "../src/pages/UserHome"
import AdminHome from "../src/pages/AdminHome"  
const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<UserHome/>}></Route>
        <Route path="/admin" element={<AdminHome/>}></Route>


      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes ;
