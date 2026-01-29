'use client';

import {useForm} from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import FooterLink from "@/components/forms/FooterLink";
import {signInWithEmail, signUpWithEmail, SignInResult, resendVerificationEmail} from "@/lib/actions/auth.actions";
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import { AlertCircle, ArrowRight, Key, Lock, Mail, RefreshCw, WifiOff, Loader2 } from "lucide-react";
import { useState } from "react";

const showEnhancedErrorToast = (result: SignInResult, router: any, onResendEmail: (email: string) => Promise<{ success: boolean; error?: string }>) => {
    const { errorCode, error, suggestedAction } = result;
    
    const errorConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
        invalid_credentials: { 
            icon: <AlertCircle className="size-5 text-red-500" />, 
            color: "text-red-500",
            bgColor: "bg-red-500/10",
            borderColor: "border-red-500/20"
        },
        user_not_found: { 
            icon: <Mail className="size-5 text-amber-500" />, 
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            borderColor: "border-amber-500/20"
        },
        invalid_password: { 
            icon: <Key className="size-5 text-orange-500" />, 
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20"
        },
        account_locked: { 
            icon: <Lock className="size-5 text-red-600" />, 
            color: "text-red-600",
            bgColor: "bg-red-600/10",
            borderColor: "border-red-600/20"
        },
        email_not_verified: { 
            icon: <Mail className="size-5 text-blue-500" />, 
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20"
        },
        network_error: { 
            icon: <WifiOff className="size-5 text-gray-500" />, 
            color: "text-gray-500",
            bgColor: "bg-gray-500/10",
            borderColor: "border-gray-500/20"
        },
        unknown_error: { 
            icon: <AlertCircle className="size-5 text-gray-400" />, 
            color: "text-gray-400",
            bgColor: "bg-gray-400/10",
            borderColor: "border-gray-400/20"
        },
    };

    const config = errorConfig[errorCode || 'unknown_error'] || errorConfig.unknown_error;

    const getActionButton = () => {
        switch (errorCode) {
            case 'invalid_credentials':
                return (
                    <button
                        onClick={() => router.push('/forgot-password')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                        <Key className="size-3.5" />
                        Forgot Password?
                    </button>
                );
            case 'invalid_password':
                return (
                    <button
                        onClick={() => router.push('/forgot-password')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-md transition-colors"
                    >
                        <Key className="size-3.5" />
                        Forgot Password?
                    </button>
                );
            case 'user_not_found':
                return (
                    <button
                        onClick={() => router.push('/sign-up')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-md transition-colors"
                    >
                        <ArrowRight className="size-3.5" />
                        Create Account
                    </button>
                );
            case 'email_not_verified':
                return (
                    <ResendEmailButton onResend={onResendEmail} />
                );
            case 'network_error':
                return (
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-500/10 rounded-md transition-colors"
                    >
                        <RefreshCw className="size-3.5" />
                        Retry
                    </button>
                );
            default:
                return (
                    <button
                        onClick={() => router.push('/forgot-password')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-gray-300 hover:bg-gray-500/10 rounded-md transition-colors"
                    >
                        <Key className="size-3.5" />
                        Forgot Password?
                    </button>
                );
        }
    };

    toast.custom((t) => (
        <div 
            className={`w-full max-w-md p-4 rounded-lg border ${config.borderColor} ${config.bgColor} backdrop-blur-sm shadow-lg animate-in slide-in-from-top-2 duration-300`}
        >
            <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
                    {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className={`font-semibold text-sm ${config.color}`}>
                            {error || 'Sign in failed'}
                        </h4>
                        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                            {errorCode?.replace(/_/g, ' ')}
                        </span>
                    </div>
                    {suggestedAction && (
                        <p className="text-sm text-muted-foreground mb-3">
                            {suggestedAction}
                        </p>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                        {getActionButton()}
                    </div>
                </div>
            </div>
        </div>
    ), {
        duration: 6000,
        style: {
            background: 'transparent',
            boxShadow: 'none',
            border: 'none',
            padding: 0,
        },
    });
};

// Separate component for resend email button with loading state
function ResendEmailButton({ onResend }: { onResend: (email: string) => Promise<{ success: boolean; error?: string }> }) {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [hasSent, setHasSent] = useState(false);

    const handleClick = async () => {
        if (!email) {
            toast.error('Please enter your email address');
            return;
        }
        
        setIsLoading(true);
        try {
            const result = await onResend(email);
            if (result.success) {
                setHasSent(true);
                toast.success('Verification email sent!', {
                    description: 'Check your inbox for the verification link.',
                    icon: <Mail className="size-4 text-green-500" />,
                });
            } else {
                toast.error('Failed to send email', {
                    description: result.error || 'Please try again.',
                });
            }
        } catch (error) {
            toast.error('Something went wrong', {
                description: 'Please try again later.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading || hasSent}
            />
            <button
                onClick={handleClick}
                disabled={isLoading || hasSent || !email}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Sending...
                    </>
                ) : hasSent ? (
                    <>
                        <Mail className="size-3.5" />
                        Sent!
                    </>
                ) : (
                    <>
                        <Mail className="size-3.5" />
                        Resend Email
                    </>
                )}
            </button>
        </div>
    );
}

import Link from "next/link"

const SignIn = () => {
    const router = useRouter()
  const {
    register, 
    handleSubmit,
    formState: {errors, isSubmitting},
    } = useForm<SignInFormData>( {
      defaultValues: {
        email: '',
        password: '',
    },
        mode: 'onBlur',
    });

const onSubmit = async (data: SignInFormData) => {
    try {
        const result = await signInWithEmail(data);
        if(result.success) {
            toast.success('Welcome back!', {
                description: 'Redirecting to your dashboard...',
                icon: <div className="size-5 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse"><ArrowRight className="size-3 text-green-500" /></div>,
                duration: 2000,
            });
            router.push('/');
        } else {
            showEnhancedErrorToast(result, router, resendVerificationEmail);
        }
    } catch (e) {
        console.error(e);
        showEnhancedErrorToast({
            success: false,
            error: e instanceof Error ? e.message : 'An unexpected error occurred',
            errorCode: 'unknown_error',
            suggestedAction: 'Please try again or contact support if the problem persists'
        }, router, resendVerificationEmail);
    }
}

const onPasswordBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Show warning toast if password is too short on blur
    if (value.length > 0 && value.length < 8) {
        toast.custom((t) => (
            <div className="w-full max-w-sm p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm shadow-lg">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 text-amber-500">
                        <Key className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-amber-500 mb-1">
                            Password may be incorrect
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                            Your password looks short. If you forgot it, use the button below.
                        </p>
                        <button
                            onClick={() => router.push('/forgot-password')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-md transition-colors"
                        >
                            <Key className="size-3.5" />
                            Forgot Password?
                        </button>
                    </div>
                </div>
            </div>
        ), {
            duration: 5000,
            style: { background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 },
        });
    }
}

  return (
    <>
      <h1 className="form-title">Welcome Back!</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          <InputField
            name="email"
            label="Email"
            placeholder="Enter your email"
            register={register}
            error={errors.email}
            validation={{ required: 'Email is required.', pattern: /^\w+@\w+\.\w+$/ }}
          />
          <InputField
            name="password"
            label="Password"
            placeholder="Enter your password"
            type="password"
            register={register}
            error={errors.password}
            validation={{ required: 'Password is required.', minLength: 8 }}
            onBlur={onPasswordBlur}
          />

        <Button type="submit" variant="premium" size="lg" disabled={isSubmitting} className="w-full mt-5 btn-shine hover-lift transition-all duration-300">
          {isSubmitting ? 'Signing In' : 'Sign In'}
        </Button>

            <div className="flex items-center justify-center gap-6 pt-4">
                <span className="text-sm text-gray-500">Don't have an <Link href="/sign-up" className="text-sm text-blue-500 hover:text-blue-400 transition-colors">account</Link>?</span>
                <span className="text-gray-600">|</span>
                <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
                    Forgot password?
                </Link>
            </div>
      </form>
    </>
  );
};
export default SignIn;