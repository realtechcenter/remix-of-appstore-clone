import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Sparkles, ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, useTranslations } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { z } from 'zod';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  fullName: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AuthMode = 'login' | 'register' | 'verify-registration' | 'forgot-password' | 'verify-reset' | 'reset-password';

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const t = useTranslations();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleLogin = async () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        toast.error(language === 'km' ? 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ' : data.error || 'Invalid credentials');
        return;
      }
      
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      toast.success(language === 'km' ? 'ចូលបានជោគជ័យ!' : 'Logged in successfully!');
      window.location.href = '/';
    } catch (error) {
      toast.error(language === 'km' ? 'មានបញ្ហាកើតឡើង' : 'Something went wrong');
    }
  };

  const handleSendRegistrationOtp = async () => {
    const result = signUpSchema.safeParse({ email, password, confirmPassword, fullName: fullName || undefined });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/otp/send-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to send OTP');
        return;
      }
      
      toast.success(language === 'km' ? 'កូដ OTP បានផ្ញើទៅអ៊ីមែលរបស់អ្នក' : 'OTP sent to your email');
      setMode('verify-registration');
      setResendCooldown(60);
    } catch (error) {
      toast.error(language === 'km' ? 'មានបញ្ហាកើតឡើង' : 'Something went wrong');
    }
  };

  const handleVerifyRegistrationOtp = async () => {
    if (otp.length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit code' });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/otp/verify-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, code: otp, password, full_name: fullName }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        toast.error(data.error || 'Invalid OTP');
        return;
      }
      
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      toast.success(language === 'km' ? 'គណនីបានបង្កើតជោគជ័យ!' : 'Account created successfully!');
      window.location.href = '/';
    } catch (error) {
      toast.error(language === 'km' ? 'មានបញ្ហាកើតឡើង' : 'Something went wrong');
    }
  };

  const handleSendPasswordResetOtp = async () => {
    if (!email || !z.string().email().safeParse(email).success) {
      setErrors({ email: 'Please enter a valid email' });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/otp/send-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to send OTP');
        return;
      }
      
      toast.success(language === 'km' ? 'កូដ OTP បានផ្ញើទៅអ៊ីមែលរបស់អ្នក' : 'OTP sent to your email');
      setMode('verify-reset');
      setResendCooldown(60);
    } catch (error) {
      toast.error(language === 'km' ? 'មានបញ្ហាកើតឡើង' : 'Something went wrong');
    }
  };

  const handleVerifyResetOtp = async () => {
    if (otp.length !== 6) {
      setErrors({ otp: 'Please enter the 6-digit code' });
      return;
    }
    setMode('reset-password');
  };

  const handleResetPassword = async () => {
    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/otp/verify-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, code: otp, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to reset password');
        return;
      }
      
      toast.success(language === 'km' ? 'ពាក្យសម្ងាត់បានប្ដូរជោគជ័យ!' : 'Password reset successfully!');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
      setOtp('');
    } catch (error) {
      toast.error(language === 'km' ? 'មានបញ្ហាកើតឡើង' : 'Something went wrong');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    const type = mode === 'verify-registration' ? 'registration' : 'password_reset';
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/otp/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, type }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        toast.error(data.error || 'Failed to resend OTP');
        return;
      }
      
      toast.success(language === 'km' ? 'កូដ OTP បានផ្ញើម្ដងទៀត' : 'OTP resent to your email');
      setResendCooldown(60);
    } catch (error) {
      toast.error(language === 'km' ? 'មានបញ្ហាកើតឡើង' : 'Something went wrong');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      switch (mode) {
        case 'login':
          await handleLogin();
          break;
        case 'register':
          await handleSendRegistrationOtp();
          break;
        case 'verify-registration':
          await handleVerifyRegistrationOtp();
          break;
        case 'forgot-password':
          await handleSendPasswordResetOtp();
          break;
        case 'verify-reset':
          await handleVerifyResetOtp();
          break;
        case 'reset-password':
          await handleResetPassword();
          break;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setOtp('');
    setErrors({});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderTitle = () => {
    switch (mode) {
      case 'login':
        return language === 'km' ? 'ចូលគណនី' : 'Sign In';
      case 'register':
        return language === 'km' ? 'បង្កើតគណនី' : 'Create Account';
      case 'verify-registration':
        return language === 'km' ? 'ផ្ទៀងផ្ទាត់អ៊ីមែល' : 'Verify Email';
      case 'forgot-password':
        return language === 'km' ? 'ភ្លេចពាក្យសម្ងាត់' : 'Forgot Password';
      case 'verify-reset':
        return language === 'km' ? 'បញ្ចូលកូដ OTP' : 'Enter OTP Code';
      case 'reset-password':
        return language === 'km' ? 'កំណត់ពាក្យសម្ងាត់ថ្មី' : 'Set New Password';
    }
  };

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center p-4 ${language === 'km' ? 'font-khmer' : ''}`}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">
            <span className="gradient-text">apps</span>
            <span className="text-muted-foreground">torrent</span>
          </h1>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-xl">
          {/* Back button for nested modes */}
          {(mode !== 'login' && mode !== 'register') && (
            <button
              type="button"
              onClick={() => {
                if (mode === 'verify-registration') {
                  setMode('register');
                  setOtp('');
                } else if (mode === 'verify-reset' || mode === 'forgot-password') {
                  setMode('login');
                  setOtp('');
                } else if (mode === 'reset-password') {
                  setMode('verify-reset');
                }
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {language === 'km' ? 'ត្រឡប់ក្រោយ' : 'Go back'}
            </button>
          )}

          <h2 className="text-xl font-semibold text-center mb-6">{renderTitle()}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Registration: Full Name */}
            {mode === 'register' && (
              <div>
                <Label htmlFor="fullName">{language === 'km' ? 'ឈ្មោះពេញ' : 'Full Name'}</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={language === 'km' ? 'បញ្ចូលឈ្មោះ' : 'Enter your name'}
                    className="pl-10"
                  />
                </div>
                {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName}</p>}
              </div>
            )}

            {/* Email field (login, register, forgot-password) */}
            {(mode === 'login' || mode === 'register' || mode === 'forgot-password') && (
              <div>
                <Label htmlFor="email">{language === 'km' ? 'អ៊ីមែល' : 'Email'}</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={language === 'km' ? 'បញ្ចូលអ៊ីមែល' : 'Enter your email'}
                    className="pl-10"
                    required
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
              </div>
            )}

            {/* Password field (login, register, reset-password) */}
            {(mode === 'login' || mode === 'register' || mode === 'reset-password') && (
              <div>
                <Label htmlFor="password">{language === 'km' ? 'ពាក្យសម្ងាត់' : 'Password'}</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={language === 'km' ? 'បញ្ចូលពាក្យសម្ងាត់' : 'Enter your password'}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
              </div>
            )}

            {/* Confirm Password field (register, reset-password) */}
            {(mode === 'register' || mode === 'reset-password') && (
              <div>
                <Label htmlFor="confirmPassword">{language === 'km' ? 'បញ្ជាក់ពាក្យសម្ងាត់' : 'Confirm Password'}</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={language === 'km' ? 'បញ្ចូលពាក្យសម្ងាត់ម្ដងទៀត' : 'Confirm your password'}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>}
              </div>
            )}

            {/* OTP Input (verify modes) */}
            {(mode === 'verify-registration' || mode === 'verify-reset') && (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  {language === 'km' 
                    ? `យើងបានផ្ញើកូដ ៦ ខ្ទង់ទៅ ${email}`
                    : `We've sent a 6-digit code to ${email}`
                  }
                </p>
                
                <div className="flex justify-center">
                  <InputOTP value={otp} onChange={setOtp} maxLength={6}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {errors.otp && <p className="text-sm text-destructive text-center">{errors.otp}</p>}
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  >
                    {resendCooldown > 0 
                      ? (language === 'km' ? `ផ្ញើម្ដងទៀតក្នុង ${resendCooldown}s` : `Resend in ${resendCooldown}s`)
                      : (language === 'km' ? 'ផ្ញើកូដម្ដងទៀត' : 'Resend code')
                    }
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting 
                ? (language === 'km' ? 'កំពុងដំណើរការ...' : 'Processing...')
                : mode === 'login' 
                  ? (language === 'km' ? 'ចូល' : 'Sign In')
                  : mode === 'register'
                    ? (language === 'km' ? 'បន្ត' : 'Continue')
                    : mode === 'forgot-password'
                      ? (language === 'km' ? 'ផ្ញើកូដ OTP' : 'Send OTP')
                      : mode === 'verify-registration' || mode === 'verify-reset'
                        ? (language === 'km' ? 'ផ្ទៀងផ្ទាត់' : 'Verify')
                        : (language === 'km' ? 'កំណត់ពាក្យសម្ងាត់ថ្មី' : 'Reset Password')
              }
            </Button>
          </form>

          {/* Forgot password link (login mode only) */}
          {mode === 'login' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot-password');
                  setErrors({});
                }}
                className="text-sm text-primary hover:underline"
              >
                {language === 'km' ? 'ភ្លេចពាក្យសម្ងាត់?' : 'Forgot password?'}
              </button>
            </div>
          )}

          {/* Toggle between login and register */}
          {(mode === 'login' || mode === 'register') && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {mode === 'login'
                  ? (language === 'km' ? 'មិនមានគណនីមែនទេ?' : "Don't have an account?")
                  : (language === 'km' ? 'មានគណនីរួចហើយ?' : 'Already have an account?')
                }
                {' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login');
                    resetForm();
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  {mode === 'login'
                    ? (language === 'km' ? 'ចុះឈ្មោះ' : 'Sign Up')
                    : (language === 'km' ? 'ចូល' : 'Sign In')
                  }
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← {language === 'km' ? 'ត្រឡប់ទៅទំព័រដើម' : 'Back to Home'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
