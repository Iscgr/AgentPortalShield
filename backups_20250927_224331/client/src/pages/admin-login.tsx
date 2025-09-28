import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  username: z.string().min(1, "نام کاربری الزامی است"),
  password: z.string().min(1, "رمز عبور الزامی است")
});

type LoginForm = z.infer<typeof loginSchema>;

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 SHERLOCK v1.0: Sending login request:', { username: data.username });
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include" // Important for session cookies
      });

      console.log('🔐 SHERLOCK v1.0: Response status:', response.status);
      
      // Always try to parse as JSON first
      let responseData;
      try {
        responseData = await response.json();
        console.log('🔐 SHERLOCK v1.0: Parsed response:', responseData);
      } catch (jsonError) {
        console.error("❌ SHERLOCK v1.0: JSON parsing failed:", jsonError);
        const responseText = await response.text();
        console.error("❌ Raw response was:", responseText);
        
        setError("خطا در پردازش پاسخ سرور");
        return;
      }

      if (response.ok && responseData.success) {
        console.log('✅ SHERLOCK v1.0: Login successful');
        toast({
          title: "ورود موفق",
          description: "به پنل مدیریت خوش آمدید"
        });
        onLoginSuccess();
      } else {
        console.log('❌ SHERLOCK v1.0: Login failed:', responseData);
        const errorMessage = responseData.error || "خطا در ورود به سیستم";
        setError(errorMessage);
        toast({
          title: "خطا در ورود",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("❌ SHERLOCK v1.0: Network error:", err);
      setError("خطا در برقراری ارتباط با سرور");
      toast({
        title: "خطا در اتصال",
        description: "خطا در برقراری ارتباط با سرور",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            MarFaNet
          </CardTitle>
          <CardDescription>
            ورود به پنل مدیریت مالی
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام کاربری</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        autoComplete="username"
                        disabled={isLoading}
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
                    <FormLabel>رمز عبور</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        autoComplete="current-password"
                        disabled={isLoading}
                        placeholder="رمز عبور خود را وارد کنید"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "در حال ورود..." : "ورود"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}