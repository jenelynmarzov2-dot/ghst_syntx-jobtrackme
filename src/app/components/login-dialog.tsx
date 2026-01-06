import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Mail, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { Toaster, toast } from "sonner";

interface LoginDialogProps {
  open: boolean;
  onLogin: (email: string, accessToken: string) => void;
}

export function LoginDialog({ open, onLogin }: LoginDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Clear form fields when dialog opens or when switching between sign-in/sign-up
  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setName("");
      setError("");
      setLoading(false);
      setShowPassword(false);
    }
  }, [open]);

  // Clear form fields when switching between sign-in and sign-up modes
  useEffect(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setError("");
    setLoading(false);
    setShowPassword(false);
  }, [isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate required fields
    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError("Password is required");
      setLoading(false);
      return;
    }

    if (isSignUp && !name.trim()) {
      setError("Name is required");
      setLoading(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      if (isSignUp) {
        // Sign up flow using Supabase Auth directly
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              name: name.trim(),
            }
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.user && !data.session) {
          // User created but needs email confirmation
          setError('Account created! Please check your email to confirm your account before signing in.');
          toast.success('Account created! Please check your email to confirm your account before signing in.');
          setLoading(false);
          // Clear form fields for new user
          setName("");
          setPassword("");
          setConfirmPassword("");
          return;
        }

        if (data.session && data.user) {
          // User created and confirmed - show success message instead of auto-login
          setError('Account created successfully! You can now sign in with your credentials.');
          toast.success('Account created successfully! You can now sign in with your credentials.');
          setLoading(false);
          // Reset form to sign-in mode and clear fields
          setIsSignUp(false);
          setName("");
          setPassword("");
          return;
        }
        setLoading(false);
      } else {
        // Sign in flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.session && data.user) {
          onLogin(data.user.email || email, data.session.access_token);
          toast.success("Successfully signed in!");
        }
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };



  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      // Configure redirect URL based on environment
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let redirectUrl;

      if (isLocalhost) {
        // For local development, use the current origin with explicit localhost
        redirectUrl = `http://localhost:5173/`;
        console.log('Local development detected. Using redirect URL:', redirectUrl);
        console.log('Current location:', window.location.href);
      } else {
        // For production/live deployment, ensure the domain is configured in Supabase
        redirectUrl = `${window.location.origin}/`;
        console.log('Live deployment detected. Ensure your domain is added to Supabase OAuth redirect URLs.');
      }

      console.log('Attempting Google OAuth sign-in...');
      console.log('Current URL:', window.location.href);
      console.log('Redirect URL:', redirectUrl);
      console.log('Protocol:', window.location.protocol);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      console.log('OAuth response:', { data, error });

      if (error) {
        throw new Error(error.message);
      }

      // The OAuth flow should redirect automatically, so we don't set loading to false here
      console.log('OAuth initiated, waiting for redirect...');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md bg-gradient-to-br from-blue-50 via-white to-purple-50 border-0 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-purple-400/10 rounded-lg"></div>
        <div className="relative z-10">
          <DialogHeader className="text-center mb-8">
            <DialogTitle className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center justify-center">
              <Mail className="w-12 h-10 text-blue-600 mr-3 self-center" />
              {isSignUp ? "Create Account" : "Welcome Back"}
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-base text-center">
              {isSignUp
                ? "Sign up to start tracking your job applications"
                : "Sign in to access your job applications"}
            </DialogDescription>
          </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 px-1">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600 z-10" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                  className="pl-12 border-gray-300 hover:border-blue-400 focus:border-blue-500 hover:shadow-none focus:shadow-none bg-white/90 backdrop-blur-sm transition-all duration-200"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600 z-10" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-12 border-gray-300 hover:border-blue-400 focus:border-blue-500 hover:shadow-none focus:shadow-none bg-white/90 backdrop-blur-sm transition-all duration-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600 z-10" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-12 pr-12 border-gray-300 hover:border-blue-400 focus:border-blue-500 hover:shadow-none focus:shadow-none bg-white/90 backdrop-blur-sm transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 hover:text-blue-500 transition-colors duration-200 z-10"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {isSignUp && (
              <p className="text-xs text-gray-500">Minimum 6 characters</p>
            )}
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600 z-10" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={isSignUp}
                  minLength={6}
                  className="pl-12 border-gray-300 hover:border-blue-400 focus:border-blue-500 hover:shadow-none focus:shadow-none bg-white/90 backdrop-blur-sm transition-all duration-200"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold flex items-center justify-center"
            >
              {loading ? "Processing..." : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  {isSignUp ? "Sign Up" : "Sign In"}
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="w-full border-2 border-black-300 text-black-600 hover:bg-white-50 hover:text-black-700"
              onClick={handleGoogleSignIn}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          </div>

          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-primary hover:text-primary/80 underline"
              disabled={loading}
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
        </div>
      </DialogContent>
      <Toaster position="top-center" richColors />
    </Dialog>
  );
}
