import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useLoginUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { User, Lock } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useLoginUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Bienvenido", description: "Inicio de sesión exitoso", variant: "success" });
        window.location.href = import.meta.env.BASE_URL + "bienvenida"; // full reload to get context
      },
      onError: () => {
        toast({ title: "Error", description: "Credenciales incorrectas", variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate({ data });
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center bg-muted/30">
      {/* Background with beautiful overlay */}
      <img 
        src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
        alt="COVIDA Foundation" 
        className="absolute inset-0 w-full h-full object-cover" 
      />
      <div className="absolute inset-0 bg-primary/40 mix-blend-multiply backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/50 animate-in slide-in-from-bottom-8 fade-in duration-500 m-4">
        <div className="text-center mb-8">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-20 h-20 mx-auto object-contain mb-4" />
          <h1 className="text-3xl font-extrabold font-display text-primary tracking-tight">COVIDAPP</h1>
          <p className="text-muted-foreground mt-2 font-medium">Fundación de Rehabilitación</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1 relative">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                {...register("username")} 
                placeholder="Nombre de usuario" 
                className="pl-12"
                error={!!errors.username} 
              />
            </div>
            {errors.username && <p className="text-sm text-destructive font-medium pl-1">{errors.username.message}</p>}
          </div>

          <div className="space-y-1 relative">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                {...register("password")} 
                type="password" 
                placeholder="Contraseña" 
                className="pl-12"
                error={!!errors.password} 
              />
            </div>
            {errors.password && <p className="text-sm text-destructive font-medium pl-1">{errors.password.message}</p>}
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg shadow-primary/25 shadow-xl mt-2" 
            isLoading={loginMutation.isPending}
          >
            Ingresar
          </Button>
        </form>

        <div className="mt-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground font-medium">
            ¿No tienes cuenta? <br className="sm:hidden" />
            <Link href="/registro" className="text-primary font-bold hover:underline ml-1">
              Regístrate ahora
            </Link>
          </p>
          <div className="border-t pt-4">
            <Link href="/admin/login" className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium hover:underline transition-colors">
              🔐 Acceso Administrador
            </Link>
          </div>
        </div>
      </div>

      {/* Footer matching original */}
      <footer className="relative z-10 w-full text-center py-4 mt-4" style={{ background: "rgba(166,240,224,0.8)" }}>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-sm font-medium text-green-800">
          <a href="#" className="hover:underline">Dirección</a>
          <span className="hidden sm:inline">|</span>
          <a href="tel:+573011234567" className="hover:underline">Número</a>
          <span className="hidden sm:inline">|</span>
          <a href="#" className="hover:underline">Guía de ayuda a discapacitados</a>
        </div>
        <p className="text-xs text-green-700 mt-1">©️ 2025 Universidad del Quindío | Alpha build v0.0.1</p>
      </footer>
    </div>
  );
}
