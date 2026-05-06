import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { ChefHat, Eye, EyeOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@restaurant.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // IMPORTANTE: Aunque tu estado local se llame 'email' (por el input),
      // se lo pasas a la función login que espera el primer parámetro como 'username'.
      await login(email, password);

      toast.success("¡Bienvenido al sistema!");
      navigate("/pos");
    } catch (error: any) {
      // Si tu backend devuelve un error específico, toast lo mostrará
      toast.error(error.response?.data?.message || "Credenciales inválidas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex font-sans">
      {/* Panel Izquierdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-600/20 via-dark-900 to-purple-600/20 items-center justify-center p-12 relative overflow-hidden border-r border-dark-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_70%)]" />
        <div className="relative z-10 max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
            <ChefHat size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            Punto de Venta - Tiendas Jhared
          </h1>
          <p className="text-dark-300 text-lg leading-relaxed">
            Hecha con el proposito de simplificar la gestión de ventas .
          </p>
          {/* Métricas de confianza */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold text-brand-400">100+</div>
              <div className="text-xs text-dark-400 mt-1 uppercase tracking-wider">
                Locales
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">50K+</div>
              <div className="text-xs text-dark-400 mt-1 uppercase tracking-wider">
                Órdenes
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">99.9%</div>
              <div className="text-xs text-dark-400 mt-1 uppercase tracking-wider">
                Uptime
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Derecho - Formulario */}
      <div className="flex-1 flex items-center justify-center p-8 bg-dark-950">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <ChefHat size={32} className="text-brand-500" />
            <h1 className="text-2xl font-bold text-white">POS-TiendasJhared</h1>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Ingreso al Sistema
          </h2>
          <p className="text-dark-400 mb-8">Usa tus credenciales de empleado</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-dark-300">
                Email Corporativo
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none transition-all"
                placeholder="ejemplo@restaurante.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-dark-300">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-600/20"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Acceder <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Credenciales Demo */}
          <div className="mt-8 p-4 bg-dark-800/30 rounded-xl border border-dark-700/50">
            <p className="text-xs text-dark-500 mb-2 font-semibold uppercase tracking-widest">
              Acceso Demo:
            </p>
            <div className="grid grid-cols-1 gap-1 text-xs text-dark-400">
              <p>
                <span className="text-brand-400">Admin:</span>{" "}
                admin@restaurant.com / admin123
              </p>
              <p>
                <span className="text-purple-400">Cajero:</span>{" "}
                cajero@restaurant.com / cashier123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
