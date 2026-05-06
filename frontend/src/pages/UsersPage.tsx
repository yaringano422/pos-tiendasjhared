import { useEffect, useState } from "react";
import { usersApi } from "../services/api";
import {
  User as UserIcon,
  Shield,
  Mail,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { User, UserRole } from "../types";
import toast from "react-hot-toast";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos");

  // Estado para el formulario (Unificado como en tu versión de Python)
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "" as string | undefined,
    role: "vendedor" as UserRole,
    is_active: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await usersApi.getAll();
      setUsers(data);
    } catch (error) {
      toast.error("No se pudo cargar la lista de usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedId) {
        // Lógica de Edición
        const updateData: Partial<User> = { ...formData };
        if (!updateData.password) delete updateData.password; // No enviar password si está vacío
        await usersApi.update(selectedId, updateData);
        toast.success("Usuario actualizado");
      } else {
        // Lógica de Creación
        if (!formData.password)
          return toast.error("La contraseña es obligatoria");
        await usersApi.create(formData);
        toast.success("Usuario creado con éxito");
      }
      clearForm();
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error en la operación");
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedId(user.id);
    setFormData({
      name: user.name ?? "",
      username: user.username ?? "",
      email: user.email ?? "",
      password: "", // Password siempre vacío al editar por seguridad
      role: user.role,
      is_active: user.is_active ?? true,
    });
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
      await usersApi.delete(id);
      toast.success("Usuario eliminado");
      fetchUsers();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const clearForm = () => {
    setSelectedId(null);
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "",
      role: "vendedor",
      is_active: true,
    });
  };

  // Filtrado lógico (Igual que en tu función load_users de Python)
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "Todos" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500/10 p-3 rounded-lg text-brand-400">
            <Shield size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
            Administración de Usuarios
          </h1>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por nombre o usuario..."
              className="bg-dark-800 border border-dark-700 text-white pl-10 pr-4 py-2 rounded-lg outline-none focus:border-brand-500 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="bg-dark-800 border border-dark-700 text-white px-4 py-2 rounded-lg outline-none"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="Todos">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="vendedor">Vendedor</option>
            <option value="almacen">Almacén</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TABLA DE USUARIOS */}
        <div className="lg:col-span-2 bg-dark-800 rounded-xl border border-dark-700 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-dark-900/50 text-gray-400 text-xs uppercase">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Rol / Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-500">
                      Cargando usuarios...
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-dark-700/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          @{user.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Mail size={12} /> {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                            user.role === "admin"
                              ? "bg-purple-500/10 text-purple-400"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {user.role}
                        </span>
                        <div
                          className={`text-[10px] mt-1 ${user.is_active ? "text-green-500" : "text-red-500"}`}
                        >
                          ● {user.is_active ? "Activo" : "Inactivo"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(user)}
                            className="p-2 hover:bg-brand-500/20 text-brand-400 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FORMULARIO DE GESTIÓN */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 shadow-2xl h-fit sticky top-6">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-wider">
            {selectedId ? (
              <Edit2 size={20} className="text-brand-400" />
            ) : (
              <UserPlus size={20} className="text-brand-400" />
            )}
            {selectedId ? "Editar Usuario" : "Nuevo Usuario"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2.5 text-white focus:border-brand-500 outline-none"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                  Username
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2.5 text-white focus:border-brand-500 outline-none"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                  Rol
                </label>
                <select
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2.5 text-white focus:border-brand-500 outline-none"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as UserRole,
                    })
                  }
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Admin</option>
                  <option value="almacen">Almacén</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2.5 text-white focus:border-brand-500 outline-none"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">
                {selectedId
                  ? "Contraseña (vacío para no cambiar)"
                  : "Contraseña"}
              </label>
              <input
                type="password"
                className="w-full bg-dark-700 border border-dark-600 rounded-lg p-2.5 text-white focus:border-brand-500 outline-none"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-3 bg-dark-900/50 p-3 rounded-lg border border-dark-700">
              <input
                type="checkbox"
                id="is_active"
                className="w-4 h-4 accent-brand-500"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
              />
              <label
                htmlFor="is_active"
                className="text-sm text-gray-300 cursor-pointer"
              >
                Usuario Activo
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-brand-500/20"
              >
                {selectedId ? "Guardar Cambios" : "Registrar"}
              </button>
              {selectedId && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="bg-dark-700 hover:bg-dark-600 text-gray-300 p-2.5 rounded-lg transition-all"
                >
                  <RefreshCw size={20} />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
