import { useEffect, useState } from "react";
import { customersApi } from "../services/api";
import type { Customer } from "../types";
import { Search, UserPlus, Phone, Mail, User, Calendar } from "lucide-react";
import toast from "react-hot-toast";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data } = await customersApi.getAll();
      setCustomers(data);
    } catch (error: any) {
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  if (loading) return <div className="p-8 text-white">Cargando base de datos de clientes...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Cartera de Clientes</h1>
          <p className="text-gray-400 text-sm">Gestiona los contactos de Tiendas JHARED</p>
        </div>
        <button 
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition-colors"
          onClick={() => {/* Aquí podrías abrir un modal para crear */}}
        >
          <UserPlus size={20} />
          Nuevo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          className="w-full bg-dark-800 border border-dark-700 rounded-lg py-2 pl-10 pr-4 text-white focus:border-brand-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((customer) => (
          <div key={customer.id} className="bg-dark-800 border border-dark-700 rounded-xl p-5 hover:border-brand-500/50 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-brand-500/10 p-3 rounded-full">
                <User className="text-brand-400" size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold">{customer.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar size={12} />
                  Desde: {new Date(customer.created_at!).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-dark-700 pt-4">
              <div className="flex items-center gap-3 text-gray-300">
                <Phone size={16} className="text-brand-400" />
                <span className="text-sm">{customer.phone || 'Sin teléfono'}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Mail size={16} className="text-brand-400" />
                <span className="text-sm">{customer.email || 'Sin correo'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}