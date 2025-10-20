import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", "/api/login", values);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data?.message || "Invalid credentials";
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: async () => {
      // Limpiar caché anterior y cargar datos frescos
      await queryClient.clear();
      await queryClient.invalidateQueries();
      
      toast({ title: "Welcome back!", description: "You have logged in successfully." });
      setLocation("/");
    },
    onError: (err: any) => {
      toast({
        title: "Login failed",
        description: err?.message ?? "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 relative overflow-hidden" data-testid="page-login">
      {/* Elementos decorativos flotantes */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200/30 rounded-full animate-bounce-slow"></div>
      <div className="absolute top-40 right-20 w-16 h-16 bg-purple-200/30 rounded-full animate-pulse-slow" style={{animationDelay: '1s'}}></div>
      <div className="absolute bottom-20 left-20 w-12 h-12 bg-green-200/30 rounded-full animate-bounce-slow" style={{animationDelay: '2s'}}></div>
      <div className="absolute bottom-40 right-10 w-24 h-24 bg-orange-200/30 rounded-full animate-pulse-slow" style={{animationDelay: '0.5s'}}></div>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-6 animate-fade-in-down">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
            <img 
              src="/tekpro-icon-transparente.png" 
              alt="Tekpro Logo" 
              className="w-10 h-10 object-contain transition-all duration-300 group-hover:scale-110"
            />
          </div>
          <div className="transition-all duration-300 group-hover:translate-x-1">
            <h1 className="text-xl font-bold text-gray-900 transition-colors duration-300 group-hover:text-blue-600">ScrumFlow</h1>
            <p className="text-sm text-gray-500 transition-colors duration-300 group-hover:text-gray-600">Project Management Platform</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Welcome Content */}
          <div className="hidden lg:block space-y-8 animate-fade-in-left">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-gray-900 leading-tight group cursor-default">
                <span className="transition-all duration-300 hover:text-blue-600 inline-block hover:scale-105">Welcome back to</span>
                <span className="text-blue-600 block transition-all duration-300 hover:scale-110 hover:translate-x-2 inline-block">ScrumFlow</span>
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed transition-all duration-300 hover:text-gray-700 hover:translate-x-1">
                Manage your projects efficiently with our powerful task management system.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-blue-200 group-hover:scale-110 group-hover:rotate-3">
                  <span className="text-blue-600 text-2xl transition-all duration-300 group-hover:scale-125">📝</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 transition-colors duration-300 group-hover:text-blue-600">Task Management</h3>
                <p className="text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">Organize and track your tasks with our intuitive Kanban board.</p>
              </div>
              
              <div className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-green-200 group-hover:scale-110 group-hover:rotate-3">
                  <span className="text-green-600 text-2xl transition-all duration-300 group-hover:scale-125">📊</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 transition-colors duration-300 group-hover:text-green-600">Project Analytics</h3>
                <p className="text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">Get insights into your project progress and team performance.</p>
              </div>
              
              <div className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-purple-200 group-hover:scale-110 group-hover:rotate-3">
                  <span className="text-purple-600 text-2xl transition-all duration-300 group-hover:scale-125">🎯</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 transition-colors duration-300 group-hover:text-purple-600">Goal Tracking</h3>
                <p className="text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">Set and achieve your project milestones with ease.</p>
              </div>
              
              <div className="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-2 hover:scale-105 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-orange-200 group-hover:scale-110 group-hover:rotate-3">
                  <span className="text-orange-600 text-2xl transition-all duration-300 group-hover:scale-125">⚡</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 transition-colors duration-300 group-hover:text-orange-600">Real-time Updates</h3>
                <p className="text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-700">Stay synchronized with your team in real-time.</p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto animate-fade-in-up" style={{animationDelay: '0.5s'}}>
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1">
              <CardHeader className="space-y-4 text-center pb-8">
                <div className="group w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border transition-all duration-300 hover:shadow-lg hover:scale-110 hover:rotate-3 cursor-pointer">
                  <img 
                    src="/tekpro-icon-transparente.png" 
                    alt="Tekpro Logo" 
                    className="w-12 h-12 object-contain transition-all duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold text-gray-900 transition-colors duration-300 hover:text-blue-600">Welcome Back</CardTitle>
                  <p className="text-gray-600 transition-colors duration-300 hover:text-gray-700">
                    Sign in to access your dashboard
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" data-testid="form-login">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem className="group">
                          <FormLabel className="text-gray-700 font-medium transition-colors duration-300 group-hover:text-blue-600">Username</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Enter your username"
                              autoComplete="username"
                              {...field}
                              data-testid="input-username"
                              className="h-12 px-4 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300 hover:border-blue-300 hover:shadow-md focus:shadow-lg focus:scale-[1.02]"
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
                        <FormItem className="group">
                          <FormLabel className="text-gray-700 font-medium transition-colors duration-300 group-hover:text-blue-600">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                {...field}
                                data-testid="input-password"
                                className="h-12 px-4 pr-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-300 hover:border-blue-300 hover:shadow-md focus:shadow-lg focus:scale-[1.02]"
                              />
                              <button
                                type="button"
                                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-all duration-300 hover:scale-110 active:scale-95"
                                onClick={() => setShowPassword(v => !v)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                data-testid="toggle-password-visibility"
                              >
                                {showPassword ? <EyeOff className="h-5 w-5 transition-transform duration-300" /> : <Eye className="h-5 w-5 transition-transform duration-300" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    <Button
                      type="submit"
                      className="group w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                          Sign in to Dashboard
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
