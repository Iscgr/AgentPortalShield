
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedAuth } from "@/contexts/unified-auth-context";
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "نام کاربری الزامی است"),
  password: z.string().min(1, "رمز عبور الزامی است")
});

type LoginForm = z.infer<typeof loginSchema>;

export default function UnifiedAuth() {
  const [loginType, setLoginType] = useState<'detecting' | 'admin'>('detecting');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Unified auth
  const {
    adminLoginMutation,
    isAuthenticated: isAdminAuth
  } = useUnifiedAuth();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAdminAuth) {
      console.log('Admin already authenticated, redirecting to dashboard');
      setLocation('/dashboard');
    }
  }, [isAdminAuth, setLocation]);

  const selectAdminPanel = () => {
    setLoginType('admin');
    form.reset();
    setError(null);
  };


  const goBack = () => {
    setLoginType('detecting');
    form.reset();
    setError(null);
  };

  const onSubmit = async (data: LoginForm) => {
    setError(null);

    if (loginType === 'admin') {
      adminLoginMutation.mutate(data, {
        onSuccess: () => {
          toast({
            title: "ورود موفق",
            description: "به پنل مدیریت خوش آمدید"
          });
        },
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.error || error?.message || "خطا در ورود";
          setError(errorMessage);
          toast({
            title: "خطا در ورود",
            description: errorMessage,
            variant: "destructive"
          });
        }
      });
  };

  const isLoading = adminLoginMutation.isPending;

  return (
    <div className="min-h-screen clay-background relative">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-slate-900/20"></div>

      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">MarFaNet</h1>
          <p className="text-blue-200">سیستم یکپارچه مدیریت مالی و CRM</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-white mb-2">
              {loginType === 'detecting' ? 'ورود به سیستم' : 'ورود ادمین'}
            </CardTitle>
            <CardDescription className="text-blue-200">
              {loginType === 'detecting' ? 'سیستم یکپارچه مدیریت مالی MarFaNet' : 'مدیریت کامل سیستم مالی'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {loginType === 'detecting' ? (
              // Direct Login
              <div className="space-y-4">
                <Button
                  onClick={selectAdminPanel}
                  className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
                >
                  <div className="flex items-center justify-center space-x-3 rtl:space-x-reverse">
                    <div className="text-right">
                      <div className="font-bold text-lg">ورود به سیستم</div>
                      <div className="text-sm text-blue-100">مدیریت یکپارچه مالی</div>
                    </div>
                  </div>
                </Button>
              </div>
            ) : (
              // Login Form
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {error && (
                    <Alert variant="destructive" className="bg-red-900/50 border-red-500">
                      <AlertDescription className="text-red-200">{error}</AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">نام کاربری</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            autoComplete="username"
                            disabled={isLoading}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="نام کاربری خود را وارد کنید"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">رمز عبور</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            autoComplete="current-password"
                            disabled={isLoading}
                            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                            placeholder="رمز عبور خود را وارد کنید"
                          />
                        </FormControl>
                        <FormMessage />
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
