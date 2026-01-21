import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, useTranslations } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  fullName: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();
  const { language } = useLanguage();
  const t = useTranslations();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setIsSubmitting(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error(language === 'km' ? 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ' : 'Invalid email or password');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success(language === 'km' ? 'ចូលបានជោគជ័យ!' : 'Logged in successfully!');
        }
      } else {
        const result = signUpSchema.safeParse({ email, password, fullName: fullName || undefined });
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach((err) => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setIsSubmitting(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error(language === 'km' ? 'អ៊ីមែលនេះបានចុះឈ្មោះរួចហើយ' : 'This email is already registered');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success(language === 'km' ? 'គណនីបានបង្កើតជោគជ័យ!' : 'Account created successfully!');
        }
      }
    } catch (err) {
      toast.error(language === 'km' ? 'មានបញ្ហាកើតឡើង' : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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
          <h2 className="text-xl font-semibold text-center mb-6">
            {isLogin 
              ? (language === 'km' ? 'ចូលគណនី' : 'Sign In')
              : (language === 'km' ? 'បង្កើតគណនី' : 'Create Account')
            }
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="fullName">
                  {language === 'km' ? 'ឈ្មោះពេញ' : 'Full Name'}
                </Label>
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
                {errors.fullName && (
                  <p className="text-sm text-destructive mt-1">{errors.fullName}</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="email">
                {language === 'km' ? 'អ៊ីមែល' : 'Email'}
              </Label>
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
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">
                {language === 'km' ? 'ពាក្យសម្ងាត់' : 'Password'}
              </Label>
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
              {errors.password && (
                <p className="text-sm text-destructive mt-1">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting 
                ? (language === 'km' ? 'កំពុងដំណើរការ...' : 'Processing...')
                : isLogin 
                  ? (language === 'km' ? 'ចូល' : 'Sign In')
                  : (language === 'km' ? 'បង្កើតគណនី' : 'Sign Up')
              }
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin 
                ? (language === 'km' ? 'មិនមានគណនីមែនទេ?' : "Don't have an account?")
                : (language === 'km' ? 'មានគណនីរួចហើយ?' : 'Already have an account?')
              }
              {' '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-primary hover:underline font-medium"
              >
                {isLogin 
                  ? (language === 'km' ? 'ចុះឈ្មោះ' : 'Sign Up')
                  : (language === 'km' ? 'ចូល' : 'Sign In')
                }
              </button>
            </p>
          </div>
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
