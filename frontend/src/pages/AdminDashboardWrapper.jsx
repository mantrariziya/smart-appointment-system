import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import axios from 'axios';
import AdminDashboard from './AdminDashboard';
import SoftwareLicensePayment from '../components/admin/SoftwareLicensePayment';
import LoadingScreen from '../components/common/LoadingScreen';

import API_URL from '../services/api';

const AdminDashboardWrapper = () => {
  const [hasLicense, setHasLicense] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkLicenseStatus();
  }, []);

  const checkLicenseStatus = async () => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user has paid for license
      const response = await axios.get(`${API}/license/check/${user.uid}`);
      
      if (response.data.success && response.data.isPaid) {
        setHasLicense(true);
      } else {
        setHasLicense(false);
      }
    } catch (error) {
      setHasLicense(false);
    } finally {
      setChecking(false);
    }
  };

  const handlePaymentSuccess = () => {
    setHasLicense(true);
  };

  if (checking) {
    return <LoadingScreen message="Verifying license..." />;
  }

  if (!hasLicense) {
    return <SoftwareLicensePayment onPaymentSuccess={handlePaymentSuccess} />;
  }

  return <AdminDashboard />;
};

export default AdminDashboardWrapper;
