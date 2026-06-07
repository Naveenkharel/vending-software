import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from '../src/Components/Navbar';
import UserHome from '../src/pages/UserHome';
import AdminHome from '../src/pages/AdminHome';
import PaymentSuccess from '../src/pages/PaymentSuccess';
import PaymentFailure from '../src/pages/PaymentFailure';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"                element={<UserHome />} />
        <Route path="/admin"           element={<AdminHome />} />
        {/* eSewa redirects to these after payment */}
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failure" element={<PaymentFailure />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;