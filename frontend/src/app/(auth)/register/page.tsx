'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const schema = z.object({
  name:     z.string().min(1, 'Name is required'),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

export default function RegisterPage() {
  const { register: registerUser } = useAuthStore();
  const router = useRouter();
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    setError('');
    try {
      await registerUser(data.email, data.password, data.name);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-4">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Start journaling your trades today</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full name</label>
            <input {...register('name')} placeholder="John Doe" autoComplete="name"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input {...register('email')} type="email" placeholder="you@example.com" autoComplete="email"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message as string}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <input {...register('password')} type="password" placeholder="Min. 8 characters" autoComplete="new-password"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message as string}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirm password</label>
            <input {...register('confirm')} type="password" placeholder="Repeat password" autoComplete="new-password"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message as string}</p>}
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button type="submit" disabled={isSubmitting}
            className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
