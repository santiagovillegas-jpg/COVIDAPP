import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useRegisterUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { User, Lock, Mail, IdCard, ArrowLeft, Shield, Clipboard } from "lucide-react";

const ENTRY_METHODS = ["Voluntario", "Remitido", "Urgencias", "Orden médica", "Otro"];
const EPS_LIST = ["Sura", "Nueva EPS", "Sanitas", "Compensar", "Famisanar", "Salud Total", "Comfenalco", "Otro", "No tiene"];

const registerSchema = z.object({
  username: z.string().min(3, "Mínimo 3 caracteres"),
  fullName: z.string().min(3, "Mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string(),
  insuranceCompany: z.string().optional(),
  insuranceNumber: z.string().optional(),
  entryMethod: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const registerMutation = useRegisterUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Cuenta creada", description: "Bienvenido a COVIDAPP", variant: "success" });
        window.location.href = import.meta.env.BASE_URL + "bienvenida";
      },
      onError: (err: any) => {
        toast({ title: "Error en registro", description: err.message || "Verifique los datos", variant: "destructive" });
      }
    }
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate({
      data: {
        username: data.username,
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        insuranceCompany: data.insuranceCompany || null,
        insuranceNumber: data.insuranceNumber || null,
        entryMethod: data.entryMethod || null,
      } as any
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 py-10 px-4">
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-primary font-bold transition-colors">
          <ArrowLeft className="w-5 h-5" /> Volver
        </Link>
      </div>

      <div className="w-full max-w-lg p-8 sm:p-10 bg-card rounded-[2rem] shadow-2xl border animate-in zoom-in-95 fade-in duration-300">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold font-display text-foreground tracking-tight">Crear Cuenta</h1>
          <p className="text-muted-foreground mt-1 font-medium">Únete a la familia COVIDAPP</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Datos personales */}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Datos personales</p>

          <div className="space-y-1">
            <div className="relative">
              <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input {...register("fullName")} placeholder="Nombre completo" className="pl-12" error={!!errors.fullName} />
            </div>
            {errors.fullName && <p className="text-sm text-destructive pl-1">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input {...register("username")} placeholder="Nombre de usuario" className="pl-12" error={!!errors.username} />
            </div>
            {errors.username && <p className="text-sm text-destructive pl-1">{errors.username.message}</p>}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input {...register("email")} type="email" placeholder="Correo electrónico" className="pl-12" error={!!errors.email} />
            </div>
            {errors.email && <p className="text-sm text-destructive pl-1">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input {...register("password")} type="password" placeholder="Contraseña" className="pl-12" error={!!errors.password} />
              </div>
              {errors.password && <p className="text-sm text-destructive pl-1">{errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input {...register("confirmPassword")} type="password" placeholder="Confirmar" className="pl-12" error={!!errors.confirmPassword} />
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive pl-1">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          {/* Datos médicos/administrativos */}
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider pt-2">Información médica (opcional)</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select {...register("insuranceCompany")}
                  className="w-full pl-10 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">EPS / Seguro</option>
                  {EPS_LIST.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div className="relative">
              <Input {...register("insuranceNumber")} placeholder="N° de afiliación" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Clipboard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select {...register("entryMethod")}
                className="w-full pl-10 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">Método de ingreso</option>
                {ENTRY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <Button type="submit" className="w-full h-14 text-lg mt-2" isLoading={registerMutation.isPending}>
            Crear cuenta
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          ¿Ya tienes cuenta?{" "}
          <Link href="/" className="text-primary font-bold hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
