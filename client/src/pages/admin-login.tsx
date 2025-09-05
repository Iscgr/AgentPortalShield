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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json"
        }
      });

      // Get response text first to handle both JSON and non-JSON responses
      const responseText = await response.text();
      console.log("Raw response:", responseText);

      if (response.ok) {
        let responseData;
        try {
          responseData = responseText ? JSON.parse(responseText) : {};
        } catch (jsonError) {
          console.error("JSON parsing error in success response:", jsonError);
          console.error("Response was:", responseText);
          
          // Check if response contains success indicators even if not JSON
          if (responseText.includes('success') || responseText.includes('موفق')) {
            toast({
              title: "ورود موفق",
              description: "به پنل مدیریت خوش آمدید"
            });
            onLoginSuccess();
            return;
          } else {
            setError("پاسخ سرور قابل پردازش نیست");
            return;
          }
        }
        
        toast({
          title: "ورود موفق",
          description: "به پنل مدیریت خوش آمدید"
        });
        onLoginSuccess();
      } else {
        let errorMessage = "خطا در ورود";
        
        try {
          const errorData = responseText ? JSON.parse(responseText) : {};
          errorMessage = errorData.error || `خطا در ورود: ${response.status}`;
        } catch (jsonError) {
          console.error("JSON parsing error in error response:", jsonError);
          console.error("Error response was:", responseText);
          
          // Extract error information from HTML or plain text
          if (responseText.includes('error') || responseText.includes('خطا')) {
            errorMessage = `خطا در ورود: ${response.status} - ${response.statusText}`;
          } else if (responseText.length > 0) {
            errorMessage = `خطا در سرور: ${responseText.substring(0, 100)}`;
          } else {
            errorMessage = `خطا در ورود: ${response.status} - ${response.statusText}`;
          }
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      console.error("Network or other error:", err);
      setError("خطا در برقراری ارتباط با سرور");
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