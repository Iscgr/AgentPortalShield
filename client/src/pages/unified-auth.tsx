import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, ArrowRight, Home, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است')
});

type LoginForm = z.infer<typeof loginSchema>;

export default function UnifiedAuth() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  });

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "ورود موفق",
          description: "به پنل مدیریت خوش آمدید",
        });
        
        setLocation('/dashboard');
      } else {
        setLoginError(result.error || 'خطا در ورود');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('خطا در اتصال به سرور');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 text-white shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white mb-2">
                ورود به سیستم مدیریت
              </CardTitle>
              <p className="text-white/80 text-sm">
                MarFaNet - سیستم مالی یکپارچه
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {loginError && (
              <Alert className="mb-6 bg-red-500/20 border-red-400/50 text-white">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90">نام کاربری</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="نام کاربری خود را وارد کنید"
                          className="bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90">رمز عبور</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="رمز عبور خود را وارد کنید"
                          className="bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
                    disabled={isLoading}
                  >
                    {isLoading ? "در حال ورود..." : "ورود"}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                    disabled={isLoading}
                  >
                    بازگشت
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}