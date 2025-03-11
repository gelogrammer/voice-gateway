
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import AuthForm from '../components/AuthForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const Register = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  return (
    <div className="page-container">
      <NavBar />
      
      <div className="page-content">
        <div className="container-tight flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create an account</CardTitle>
              <CardDescription>
                Sign up to participate in our research study
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <AuthForm type="register" />
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Register;
