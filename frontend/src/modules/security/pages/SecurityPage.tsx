import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema } from '../validators/user.validator';
import type { UserFormValues } from '../validators/user.validator';
import type { Role, Permission, UserDetail } from '../types/security.types';
import {
  getRoles,
  getPermissions,
  updateRolePermissions,
  getUsers,
  createUser,
  toggleUserStatus,
  createRole,
  deleteRole,
  unlockUser
} from '../services/security.api';
import {
  Shield,
  Check,
  AlertTriangle,
  UserPlus,
  Mail,
  Lock,
  Plus,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Unlock,
  Copy
} from 'lucide-react';

export const SecurityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'users'>('matrix');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [usersList, setUsersList] = useState<UserDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para mostrar contraseña temporal generada al desbloquear
  const [unlockedPassword, setUnlockedPassword] = useState<string | null>(null);
  const [unlockedUserEmail, setUnlockedUserEmail] = useState<string>('');

  // Estados de la pestaña Matriz
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [matrixMsg, setMatrixMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado para creación de rol
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [roleError, setRoleError] = useState<string | null>(null);

  // Estados de la pestaña Usuarios
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Formulario de creación de usuarios
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      roles: [],
    }
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rolesData = await getRoles();
      const permsData = await getPermissions();
      const usersData = await getUsers();

      setRoles(rolesData);
      setPermissions(permsData);
      setUsersList(usersData);

      // Seleccionar ADMIN por defecto o el primer rol disponible
      const adminRole = rolesData.find((r) => r.nombre === 'ADMIN') || rolesData[0] || null;
      if (adminRole) {
        setSelectedRole(adminRole);
        setSelectedPermIds(adminRole.permisos.map((p) => p.id));
      } else {
        setSelectedRole(null);
        setSelectedPermIds([]);
      }
    } catch (err: any) {
      setError('No se pudo cargar la matriz de seguridad. Por favor reintenta.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermIds(role.permisos.map((p) => p.id));
    setMatrixMsg(null);
  };

  // Manejo de la selección de checks
  const handlePermissionToggle = (permId: string) => {
    setMatrixMsg(null);
    if (selectedPermIds.includes(permId)) {
      setSelectedPermIds(selectedPermIds.filter((id) => id !== permId));
    } else {
      setSelectedPermIds([...selectedPermIds, permId]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSubmitLoading(true);
    setMatrixMsg(null);
    try {
      await updateRolePermissions(selectedRole.id, selectedPermIds);
      setMatrixMsg({ type: 'success', text: 'Los permisos del rol se han actualizado correctamente.' });
      
      const updatedRoles = await getRoles();
      setRoles(updatedRoles);
      const currentUpdated = updatedRoles.find((r) => r.id === selectedRole.id);
      if (currentUpdated) {
        setSelectedRole(currentUpdated);
      }
    } catch (err: any) {
      setMatrixMsg({ type: 'error', text: 'Ocurrió un error al guardar los permisos en la base de datos.' });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Crear un Rol Dinámico
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoleName.trim() === '') return;
    setIsSubmitLoading(true);
    setRoleError(null);
    try {
      await createRole({ nombre: newRoleName, descripcion: newRoleDesc });
      setNewRoleName('');
      setNewRoleDesc('');
      setIsRoleModalOpen(false);
      
      // Recargar roles
      const updatedRoles = await getRoles();
      setRoles(updatedRoles);
    } catch (err: any) {
      setRoleError(err.response?.data?.message || 'Error al intentar crear el rol.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Borrar un Rol Dinámico
  const handleDeleteRole = async (e: React.MouseEvent, roleId: string, roleName: string) => {
    e.stopPropagation(); // Evitar seleccionar el rol al hacer clic en borrar
    if (window.confirm(`¿Estás seguro de que deseas eliminar el rol "${roleName}"? Esta acción es irreversible.`)) {
      try {
        await deleteRole(roleId);
        
        const updatedRoles = await getRoles();
        setRoles(updatedRoles);
        
        // Si el rol borrado estaba seleccionado, reseleccionar ADMIN
        if (selectedRole?.id === roleId) {
          const adminRole = updatedRoles.find((r) => r.nombre === 'ADMIN') || updatedRoles[0] || null;
          if (adminRole) {
            setSelectedRole(adminRole);
            setSelectedPermIds(adminRole.permisos.map((p) => p.id));
          } else {
            setSelectedRole(null);
            setSelectedPermIds([]);
          }
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error al eliminar el rol.');
      }
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const activeState = await toggleUserStatus(userId);
      setUsersList(
        usersList.map((u) => (u.id === userId ? { ...u, activo: activeState } : u))
      );
      
      const updatedRoles = await getRoles();
      setRoles(updatedRoles);
      if (selectedRole) {
        const currentUpdated = updatedRoles.find((r) => r.id === selectedRole.id);
        if (currentUpdated) setSelectedRole(currentUpdated);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cambiar estado del usuario.');
    }
  };

  const handleUnlockUser = async (userId: string, email: string) => {
    try {
      const data = await unlockUser(userId);
      setUnlockedPassword(data.tempPassword);
      setUnlockedUserEmail(email);
      const updatedUsers = await getUsers();
      setUsersList(updatedUsers);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al intentar desbloquear al usuario.');
    }
  };

  const onSubmitUser = async (data: UserFormValues) => {
    setIsSubmitLoading(true);
    setModalError(null);
    try {
      await createUser(data);
      setIsUserModalOpen(false);
      reset();
      
      const updatedUsers = await getUsers();
      setUsersList(updatedUsers);
      const updatedRoles = await getRoles();
      setRoles(updatedRoles);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'No se pudo registrar el usuario.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center max-w-2xl mx-auto mt-8 shadow-sm flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-xs text-slate-500 font-bold">Consultando matriz de seguridad y usuarios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-3xl p-12 text-center max-w-md mx-auto mt-8 shadow-sm flex flex-col items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-500 mb-3" />
        <p className="text-xs font-bold text-red-800">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-white hover:bg-slate-50 text-xs font-bold text-red-700 rounded-xl border border-red-200 shadow-sm transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full font-sans">
      
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E8EE] pb-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-[#1B1D22] text-white shadow-md shadow-[#1B1D22]/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1B1D22] tracking-tight">Seguridad y Permisos RBAC</h2>
            <p className="text-xs text-[#747780] font-medium">Administra los accesos y funciones de tu equipo mediante control de roles.</p>
          </div>
        </div>

        {/* Pestañas de Navegación (Tabs) */}
        <div className="flex bg-[#F4F6F9] p-1 rounded-xl border border-[#E5E8EE] self-start sm:self-auto text-[#37474F]">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'matrix' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Matriz de Permisos
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'users' ? 'bg-white text-[#1A73E8] shadow-xs border border-[#E5E8EE]' : 'text-[#747780] hover:text-[#1B1D22]'
            }`}
          >
            Usuarios ({usersList.length})
          </button>
        </div>
      </div>

      {/* --- PESTAÑA: MATRIZ DE PERMISOS --- */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Panel Izquierdo: Lista de Roles */}
          <div className="lg:col-span-1 bg-white border border-[#E5E8EE] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-2">
              <h3 className="text-xs font-extrabold text-[#747780] uppercase tracking-wider">Roles del Sistema</h3>
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="btn-precision-primary text-[10px] py-1 px-3"
                title="Crear un nuevo rol personalizado"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo Rol
              </button>
            </div>

            <div className="space-y-2">
              {roles.map((rol) => (
                <button
                  key={rol.id}
                  onClick={() => handleRoleSelect(rol)}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group ${
                    selectedRole?.id === rol.id
                      ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8] shadow-xs font-bold'
                      : 'border-[#E5E8EE] hover:border-[#1A73E8]/30 text-[#37474F] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="min-w-0 pr-2 flex-1">
                    <span className="block font-bold text-sm truncate">{rol.nombre}</span>
                    <span className="block text-[10px] text-slate-400 truncate mt-0.5">{rol.descripcion}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-500 border border-slate-200">
                      {rol.usuarioCount} user{rol.usuarioCount !== 1 ? 's' : ''}
                    </span>
                    
                    {/* Botón de eliminar rol (Oculto para ADMIN) */}
                    {rol.nombre !== 'ADMIN' && (
                      <span
                        onClick={(e) => handleDeleteRole(e, rol.id, rol.nombre)}
                        className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-650 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar rol"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Panel Derecho: Checks de Permisos */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col min-w-0">
            {selectedRole ? (
              <div className="flex-1 flex flex-col space-y-6">
                
                {/* Cabecera del Rol seleccionado */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Permisos para el Rol: <span className="text-blue-600">{selectedRole.nombre}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{selectedRole.descripcion}</p>
                  </div>

                  <button
                    onClick={handleSavePermissions}
                    disabled={isSubmitLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 flex items-center gap-2 transition-colors disabled:opacity-50 font-sans"
                  >
                    {isSubmitLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Guardar Cambios</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Mensaje de retroalimentación */}
                {matrixMsg && (
                  <div className={`p-4 rounded-xl text-xs flex items-start gap-2 border ${
                    matrixMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${matrixMsg.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`} />
                    <span>{matrixMsg.text}</span>
                  </div>
                )}

                {/* Lista de Checkboxes agrupados (Tocando Check) */}
                <div className="flex-1 overflow-y-auto max-h-[450px] pr-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permissions.map((perm) => {
                      const isChecked = selectedPermIds.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'border-blue-200 bg-blue-50/10 text-slate-800 shadow-sm shadow-blue-500/5'
                              : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/30 text-slate-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePermissionToggle(perm.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer mt-0.5"
                          />
                          <div className="space-y-0.5 text-left">
                            <span className="block font-bold text-xs tracking-wide text-slate-900 font-mono">
                              {perm.codigo}
                            </span>
                            <span className="block text-[10px] text-slate-500 leading-normal font-normal">
                              {perm.descripcion}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center p-12 text-slate-400">Selecciona un rol a la izquierda para configurar sus permisos</div>
            )}
          </div>

        </div>
      )}

      {/* --- PESTAÑA: GESTIÓN DE USUARIOS --- */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Barra de Filtro / Registrar Usuario */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lista de Usuarios del ERP</h3>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Usuario</span>
            </button>
          </div>

          {/* Tabla de Usuarios */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <th className="p-4">Usuario</th>
                    <th className="p-4">Correo Electrónico</th>
                    <th className="p-4">Sucursal</th>
                    <th className="p-4">Roles Asignados</th>
                    <th className="p-4 text-center">Estado (Activo)</th>
                    <th className="p-4 text-center">Seguridad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                  {usersList.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 font-bold text-slate-900">
                        {userItem.nombre} {userItem.apellido}
                      </td>
                      <td className="p-4 font-mono text-slate-500">
                        {userItem.email}
                      </td>
                      <td className="p-4 text-slate-700">
                        {userItem.sucursal?.nombre || <span className="text-slate-400 italic">Global</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {userItem.roles.map((rol) => (
                            <span
                              key={rol.id}
                              className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-[9px] font-bold text-blue-700 uppercase"
                            >
                              {rol.nombre}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(userItem.id)}
                          className="inline-flex items-center justify-center p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                          title={userItem.activo ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {userItem.activo ? (
                            <ToggleRight className="w-7 h-7 text-blue-600 cursor-pointer" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-slate-300 cursor-pointer" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {userItem.bloqueado ? (
                            <>
                              <span className="px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-[9px] font-extrabold text-red-700 uppercase animate-pulse">
                                Bloqueado
                              </span>
                              <button
                                onClick={() => handleUnlockUser(userItem.id, userItem.email)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-bold rounded-lg shadow-sm transition-colors"
                                title="Desbloquear usuario y generar contraseña temporal"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Desbloquear</span>
                              </button>
                            </>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full border border-emerald-100 bg-emerald-50 text-[9px] font-bold text-emerald-700 uppercase">
                              Seguro
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CREAR NUEVO ROL (TEMA CLARO) --- */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Crear Rol Personalizado</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Define un nuevo perfil de acceso para tu equipo comercial o técnico.</p>
            </div>

            {roleError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] mb-4">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{roleError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Rol</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ej. OPERACIONES"
                  className="w-full px-3 py-1.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-sans"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descripción (Opcional)</label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Ej. Control de despachos y logística"
                  className="w-full px-3 py-1.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsRoleModalOpen(false);
                    setNewRoleName('');
                    setNewRoleDesc('');
                    setRoleError(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading || newRoleName.trim() === ''}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 flex items-center gap-1.5 transition-colors disabled:opacity-50 font-sans"
                >
                  {isSubmitLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Crear Rol</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: REGISTRAR NUEVO USUARIO --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-md w-full relative">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <span>Registrar Nuevo Colaborador</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">El usuario heredará los permisos según los roles asignados.</p>
            </div>

            {modalError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px] mb-4">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmitUser, (errs) => console.log('Errores de validación:', errs))} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre</label>
                  <input
                    type="text"
                    {...register('nombre')}
                    placeholder="Ej. Juan"
                    className={`w-full px-3 py-1.5 bg-slate-50/50 border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                      errors.nombre ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                  {errors.nombre && <p className="text-[9px] text-red-650 mt-1">{errors.nombre.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Apellido</label>
                  <input
                    type="text"
                    {...register('apellido')}
                    placeholder="Ej. Pérez"
                    className={`w-full px-3 py-1.5 bg-slate-50/50 border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                      errors.apellido ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                  {errors.apellido && <p className="text-[9px] text-red-650 mt-1">{errors.apellido.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Correo de Acceso</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="juan.perez@empresa.com"
                    className={`w-full pl-9 pr-4 py-1.5 bg-slate-50/50 border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                      errors.email ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-[9px] text-red-650 mt-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contraseña Temporal</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    {...register('password')}
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-4 py-1.5 bg-slate-50/50 border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                      errors.password ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                </div>
                {errors.password && <p className="text-[9px] text-red-650 mt-1">{errors.password.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Asignación de Roles</label>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-[120px] overflow-y-auto space-y-1.5">
                  {roles.map((rol) => (
                    <label key={rol.id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        value={rol.id}
                        {...register('roles')}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <span>{rol.nombre}</span>
                    </label>
                  ))}
                </div>
                {errors.roles && <p className="text-[9px] text-red-650 mt-1">{errors.roles.message}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserModalOpen(false);
                    reset();
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl border border-slate-200 transition-all font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 flex items-center gap-1.5 transition-colors disabled:opacity-50 font-sans"
                >
                  {isSubmitLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Registrar</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      {/* --- MODAL: USUARIO DESBLOQUEADO (CONTRASEÑA TEMPORAL) --- */}
      {unlockedPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative">
            <div className="border-b border-slate-100 pb-3 mb-4 text-center">
              <div className="inline-flex items-center justify-center p-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 mb-2">
                <Unlock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                ¡Usuario Desbloqueado!
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">La cuenta de {unlockedUserEmail} se ha desbloqueado correctamente.</p>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 text-center leading-relaxed">
                Facilita esta **contraseña temporal** al colaborador para que inicie sesión. Se le obligará a cambiarla en su primer acceso.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between font-mono">
                <span className="text-sm font-black text-slate-900 tracking-wider">
                  {unlockedPassword}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(unlockedPassword);
                    alert('¡Contraseña temporal copiada al portapapeles!');
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                  title="Copiar contraseña"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setUnlockedPassword(null)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors font-sans"
              >
                Aceptar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FIN MODAL --- */}
      </div>
  );
};
