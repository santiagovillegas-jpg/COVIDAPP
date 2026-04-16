import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useLoginUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Lock, User, ArrowLeft } from "lucide-react";

const adminLoginSchema = z.object({
  username: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

export default function AdminLogin() {
  const { register, handleSubmit, formState: { errors } } = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
  });

  const loginMutation = useLoginUser({
    mutation: {
      onSuccess: (data: any) => {
        const role = data?.user?.role ?? data?.role;
        if (role === "superadmin") {
          toast({ title: "Bienvenido, Administrador", description: "Acceso concedido", variant: "success" });
          window.location.href = import.meta.env.BASE_URL + "admin";
        } else if (role === "therapist") {
          toast({ title: "Bienvenido, Terapeuta", description: "Acceso concedido", variant: "success" });
          window.location.href = import.meta.env.BASE_URL + "terapeuta";
        } else if (role === "nonmedical_admin") {
          toast({ title: "Bienvenido", description: "Acceso concedido", variant: "success" });
          window.location.href = import.meta.env.BASE_URL + "admininfo";
        } else {
          toast({ title: "Acceso denegado", description: "Esta cuenta no tiene permisos de administrador", variant: "destructive" });
        }
      },
      onError: () => {
        toast({ title: "Error", description: "Credenciales incorrectas", variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: AdminLoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-red-50 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/80 via-red-800/60 to-red-600/40" />

      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-white/97 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-red-100 animate-in slide-in-from-bottom-8 fade-in duration-500 m-4">
        <div className="absolute top-5 left-5">
          <Link href="/" className="flex items-center gap-1 text-muted-foreground hover:text-red-600 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
        </div>

        <div className="text-center mb-8 pt-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-9 h-9 text-red-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-red-700 tracking-tight">Administrador</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Acceso restringido — COVIDAPP</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                {...register("username")}
                placeholder="Usuario administrador"
                className="pl-12 border-red-200 focus:border-red-400"
                error={!!errors.username}
              />
            </div>
            {errors.username && <p className="text-sm text-destructive pl-1">{errors.username.message}</p>}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                {...register("password")}
                type="password"
                placeholder="Contraseña"
                className="pl-12 border-red-200 focus:border-red-400"
                error={!!errors.password}
              />
            </div>
            {errors.password && <p className="text-sm text-destructive pl-1">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-14 text-lg bg-red-600 hover:bg-red-700 shadow-lg mt-2"
            isLoading={loginMutation.isPending}
          >
            Ingresar como Administrador
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          ¿Eres paciente?{" "}
          <Link href="/" className="text-green-600 font-bold hover:underline">
            Acceder aquí
          </Link>
        </p>
      </div>

      <footer className="relative z-10 w-full text-center py-4 mt-4" style={{ background: "rgba(166,240,224,0.8)" }}>
        <p className="text-xs text-green-700">©️ 2025 Universidad del Quindío | Alpha build v0.0.1</p>
      </footer>
    </div>
  );
}
