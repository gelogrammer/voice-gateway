
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from "@/components/ui/sonner";
import { Loader2 } from 'lucide-react';

type AuthFormProps = {
  type: 'login' | 'register';
};

const AuthForm: React.FC<AuthFormProps> = ({ type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    try {
      if (type === 'login') {
        await login(email, password);
        navigate('/dashboard');
      } else {
        await register(email, password, fullName);
        toast.success('Registration successful! Please log in.');
        navigate('/login');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {type === 'register' && (
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full"
            required
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full"
          required
          minLength={6}
        />
      </div>
      
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {type === 'login' ? 'Logging in...' : 'Registering...'}
          </>
        ) : (
          type === 'login' ? 'Log In' : 'Register'
        )}
      </Button>
      
      <div className="text-center text-sm">
        {type === 'login' ? (
          <p>
            Don't have an account?{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={() => navigate('/register')}
            >
              Register here
            </Button>
          </p>
        ) : (
          <p>
            Already have an account?{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={() => navigate('/login')}
            >
              Log in here
            </Button>
          </p>
        )}
      </div>
    </form>
  );
};

export default AuthForm;
