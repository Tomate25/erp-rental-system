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
  unlockUser,
  updateUserModulePermissions,
  syncVendedores,
} from '../services/security.api';
import { ModulePermissionsMatrix } from '../components/ModulePermissionsMatrix';
import {
  ERP_MODULES_CATALOG,
  getDefaultModulePermissionsForRoles,
  mapToModulePermissionItems,
  summarizeModulePermissions,
  type UserModulePermissionsMap,
} from '../../../shared/constants/modules';
import {
  Shield,
  Check,
  AlertTriangle,
  UserPlus,
  Plus,
  RefreshCw,
  Trash2,
  Unlock,
  Copy,
  SlidersHorizontal,
  X,
} from 'lucide-react';

const ROLE_SUBTITLES: Record<string, string> = {
  ADMIN: 'Administración total',
  GERENTE: 'Dirección general',
  COMERCIAL: 'Ventas y cotizaciones',
  VENDEDOR: 'Ventas y comisiones',
  RRHH: 'Recursos humanos',
  OPERACIONES: 'Despachos y retornos',
  FACTURACION: 'Caja y facturación',
  CONTABILIDAD: 'Contabilidad y finanzas',
  MANTENIMIENTO: 'Taller y mantenimiento',
  BODEGA: 'Bodega e insumos',
  LOGISTICA: 'Logística y transporte',
  SUPERVISOR: 'Supervisión operativa',
  AUDITOR: 'Auditoría y control',
};

export const SecurityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [usersList, setUsersList] = useState<UserDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [unlockedPassword, setUnlockedPassword] = useState<string | null>(null);
  const [unlockedUserEmail, setUnlockedUserEmail] = useState<string>('');

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [matrixMsg, setMatrixMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [roleError, setRoleError] = useState<string | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [createPersonalized, setCreatePersonalized] = useState(false);
  const [createModulePerms, setCreateModulePerms] = useState<UserModulePermissionsMap>({});

  const [isEditRolesModalOpen, setIsEditRolesModalOpen] = useState(false);
  const [userToEditRoles, setUserToEditRoles] = useState<UserDetail | null>(null);
  const [editingRoleIds, setEditingRoleIds] = useState<string[]>([]);
  const [editingPersonalized, setEditingPersonalized] = useState(false);
  const [editingModulePerms, setEditingModulePerms] = useState<UserModulePermissionsMap>({});
  const [editRolesError, setEditRolesError] = useState<string | null>(null);

  const [isSyncingVendedores, setIsSyncingVendedores] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      email: '',
      password: '',
      roles: [],
    },
  });

  const watchedCreateRoleIds = watch('roles') || [];
  const createSelectedRoleNames = roles
    .filter((r) => watchedCreateRoleIds.includes(r.id))
    .map((r) => r.nombre);
  const editSelectedRoleNames = roles
    .filter((r) => editingRoleIds.includes(r.id))
    .map((r) => r.nombre);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rolesData, permsData, usersData] = await Promise.all([
        getRoles(),
        getPermissions(),
        getUsers(),
      ]);

      setRoles(rolesData);
      setPermissions(permsData);
      setUsersList(usersData);

      const adminRole = rolesData.find((r) => r.nombre === 'ADMIN') || rolesData[0] || null;
      if (adminRole) {
        setSelectedRole(adminRole);
        setSelectedPermIds(adminRole.permisos.map((p) => p.id));
      } else {
        setSelectedRole(null);
        setSelectedPermIds([]);
      }
    } catch {
      setError('No se pudo cargar la configuración de seguridad. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermIds(role.permisos ? role.permisos.map((p) => p.id) : []);
    setMatrixMsg(null);
  };

  const handlePermissionToggle = (permId: string) => {
    setMatrixMsg(null);
    if (selectedPermIds.includes(permId)) {
      setSelectedPermIds(selectedPermIds.filter((id) => id !== permId));
    } else {
      setSelectedPermIds([...selectedPermIds, permId]);
    }
  };

  const handleSelectAllPermissions = () => {
    setSelectedPermIds(permissions.map((p) => p.id));
    setMatrixMsg(null);
  };

  const handleDeselectAllPermissions = () => {
    setSelectedPermIds([]);
    setMatrixMsg(null);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSubmitLoading(true);
    setMatrixMsg(null);
    try {
      await updateRolePermissions(selectedRole.id, selectedPermIds);
      setMatrixMsg({
        type: 'success',
        text: `Los permisos del rol "${selectedRole.nombre}" se actualizaron correctamente.`,
      });

      const updatedRoles = await getRoles();
      setRoles(updatedRoles);
      const currentUpdated = updatedRoles.find((r) => r.id === selectedRole.id);
      if (currentUpdated) {
        setSelectedRole(currentUpdated);
        setSelectedPermIds(currentUpdated.permisos.map((p) => p.id));
      }
    } catch (err: any) {
      setMatrixMsg({
        type: 'error',
        text: err.response?.data?.message || 'No se pudieron guardar los permisos del rol.',
      });
    } finally {
      setIsSubmitLoading(false);
    }
  };

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
      const updatedRoles = await getRoles();
      setRoles(updatedRoles);
    } catch (err: any) {
      setRoleError(err.response?.data?.message || 'No se pudo crear el rol.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleDeleteRole = async (e: React.MouseEvent, roleId: string, roleName: string) => {
    e.stopPropagation();
    if (window.confirm(`¿Deseas eliminar el rol "${roleName}"? Esta acción es irreversible.`)) {
      try {
        await deleteRole(roleId);
        const updatedRoles = await getRoles();
        setRoles(updatedRoles);
        if (selectedRole?.id === roleId) {
          const fallback = updatedRoles.find((r) => r.nombre === 'ADMIN') || updatedRoles[0] || null;
          setSelectedRole(fallback);
          setSelectedPermIds(fallback ? fallback.permisos.map((p) => p.id) : []);
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error al eliminar el rol.');
      }
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      const activeState = await toggleUserStatus(userId);
      setUsersList(usersList.map((u) => (u.id === userId ? { ...u, activo: activeState } : u)));
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
      alert(err.response?.data?.message || 'Error al desbloquear al usuario.');
    }
  };

  const onSubmitUser = async (data: UserFormValues) => {
    setIsSubmitLoading(true);
    setModalError(null);
    try {
      await createUser({
        ...data,
        permisosModulosPersonalizados: createPersonalized,
        permisosModulos: createPersonalized
          ? mapToModulePermissionItems(createModulePerms)
          : [],
      });
      setIsUserModalOpen(false);
      setCreatePersonalized(false);
      setCreateModulePerms({});
      reset();

      const [updatedUsers, updatedRoles] = await Promise.all([getUsers(), getRoles()]);
      setUsersList(updatedUsers);
      setRoles(updatedRoles);
      setSyncFeedback('Usuario registrado y permisos por módulo configurados.');
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'No se pudo registrar el usuario.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleOpenEditRoles = (userItem: UserDetail) => {
    setUserToEditRoles(userItem);
    setEditingRoleIds(userItem.roles.map((r) => r.id));
    const isCustom = Boolean(userItem.permisosModulosPersonalizados);
    setEditingPersonalized(isCustom);
    setEditingModulePerms(
      isCustom
        ? { ...(userItem.permisosModulos || {}) }
        : getDefaultModulePermissionsForRoles(userItem.roles.map((r) => r.nombre)),
    );
    setEditRolesError(null);
    setIsEditRolesModalOpen(true);
  };

  const handleToggleEditRole = (roleId: string) => {
    setEditRolesError(null);
    if (editingRoleIds.includes(roleId)) {
      setEditingRoleIds(editingRoleIds.filter((id) => id !== roleId));
    } else {
      setEditingRoleIds([...editingRoleIds, roleId]);
    }
  };

  const handleSaveUserRoles = async () => {
    if (!userToEditRoles) return;
    if (editingRoleIds.length === 0) {
      setEditRolesError('El usuario debe conservar al menos un rol asignado.');
      return;
    }
    setIsSubmitLoading(true);
    setEditRolesError(null);
    try {
      await updateUserModulePermissions(userToEditRoles.id, {
        personalizado: editingPersonalized,
        permisosModulos: editingPersonalized
          ? mapToModulePermissionItems(editingModulePerms)
          : [],
        rolIds: editingRoleIds,
      });
      setIsEditRolesModalOpen(false);
      setUserToEditRoles(null);
      const [updatedUsers, updatedRoles] = await Promise.all([getUsers(), getRoles()]);
      setUsersList(updatedUsers);
      setRoles(updatedRoles);
      setSyncFeedback(
        editingPersonalized
          ? 'Permisos personalizados por módulo actualizados con efecto inmediato.'
          : 'Roles actualizados con acceso predeterminado del rol.',
      );
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      setEditRolesError(err.response?.data?.message || 'Error al actualizar los permisos del usuario.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleSyncVendedores = async () => {
    setIsSyncingVendedores(true);
    try {
      const res = await syncVendedores();
      setSyncFeedback(
        `Sincronización completada: ${res.totalSincronizados ?? 0} usuarios comerciales verificados en Nómina.`,
      );
      const updatedUsers = await getUsers();
      setUsersList(updatedUsers);
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al sincronizar vendedores con nómina.');
    } finally {
      setIsSyncingVendedores(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-lg mx-auto mt-8 flex flex-col items-center justify-center">
        <RefreshCw className="w-6 h-6 text-slate-500 animate-spin mb-3" />
        <p className="text-xs text-slate-600 font-medium">Cargando usuarios y permisos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-md mx-auto mt-8 flex flex-col items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-600 mb-3" />
        <p className="text-xs font-semibold text-slate-800">{error}</p>
        <button
          type="button"
          onClick={loadData}
          className="mt-4 px-4 py-1.5 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 rounded-lg border border-slate-300 cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto w-full font-sans">
      {/* Encabezado ejecutivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#1B1D22] text-white flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Seguridad, Usuarios y Roles
            </h2>
            <p className="text-xs text-slate-500">
              Control de acceso por usuario y módulo ({ERP_MODULES_CATALOG.length} módulos del ERP).
            </p>
          </div>
        </div>

        {/* Navegación de pestañas sobria */}
        <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Usuarios ({usersList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Roles del Sistema ({roles.length})
          </button>
        </div>
      </div>

      {/* --- PESTAÑA: GESTIÓN DE USUARIOS --- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white px-4 py-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">Directorio de Usuarios</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Selecciona cualquier usuario para configurar qué módulos puede ver o editar.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncVendedores}
                disabled={isSyncingVendedores}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                title="Sincronizar usuarios comerciales con Nómina"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncingVendedores ? 'animate-spin' : ''}`} />
                <span>{isSyncingVendedores ? 'Sincronizando...' : 'Sincronizar Vendedores'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1B1D22] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Usuario</span>
              </button>
            </div>
          </div>

          {syncFeedback && (
            <div className="px-4 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-medium flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setSyncFeedback(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label="Cerrar mensaje"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Tabla corporativa de usuarios */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    <th className="py-3 px-4">Usuario</th>
                    <th className="py-3 px-4">Correo</th>
                    <th className="py-3 px-4">Sucursal</th>
                    <th className="py-3 px-4">Rol</th>
                    <th className="py-3 px-4">Acceso a Módulos</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Seguridad</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {usersList.map((userItem) => {
                    const isUserAdmin = userItem.roles.some((r) => r.nombre.toUpperCase() === 'ADMIN');
                    const isUserCustom = Boolean(userItem.permisosModulosPersonalizados) && !isUserAdmin;
                    const effectivePerms = isUserCustom
                      ? userItem.permisosModulos || {}
                      : getDefaultModulePermissionsForRoles(userItem.roles.map((r) => r.nombre));
                    const modSummary = summarizeModulePermissions(effectivePerms);
                    const activeModList = ERP_MODULES_CATALOG.filter((m) => Boolean(effectivePerms[m.id]));

                    return (
                      <tr key={userItem.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {userItem.nombre} {userItem.apellido}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {userItem.email}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {userItem.sucursal?.nombre || <span className="text-slate-400">Global</span>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {userItem.roles.map((rol) => (
                              <span
                                key={rol.id}
                                className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700"
                              >
                                {rol.nombre}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isUserAdmin ? (
                            <span className="text-[11px] font-semibold text-slate-900">
                              Acceso total ({ERP_MODULES_CATALOG.length}/{ERP_MODULES_CATALOG.length})
                            </span>
                          ) : isUserCustom ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-semibold text-slate-900">
                                  Personalizado ({modSummary.total}/{ERP_MODULES_CATALOG.length})
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="text-slate-600 tabular-nums">
                                  {modSummary.lectura} ver, {modSummary.escritura} escribir
                                </span>
                              </div>
                              {activeModList.length > 0 && (
                                <p
                                  className="text-[10px] text-slate-500 max-w-[240px] truncate"
                                  title={activeModList
                                    .map(
                                      (m) =>
                                        `${m.nombre} (${effectivePerms[m.id] === 'LECTURA' ? 'Solo ver' : 'Escribir'})`,
                                    )
                                    .join(', ')}
                                >
                                  {activeModList
                                    .slice(0, 2)
                                    .map(
                                      (m) =>
                                        `${m.nombre} (${effectivePerms[m.id] === 'LECTURA' ? 'Ver' : 'Esc.'})`,
                                    )
                                    .join(', ')}
                                  {activeModList.length > 2 ? ` +${activeModList.length - 2}` : ''}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Según rol ({modSummary.total}/{ERP_MODULES_CATALOG.length})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(userItem.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 cursor-pointer transition-colors"
                            title={userItem.activo ? 'Desactivar usuario' : 'Activar usuario'}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                userItem.activo ? 'bg-emerald-600' : 'bg-slate-300'
                              }`}
                            />
                            <span>{userItem.activo ? 'Activo' : 'Inactivo'}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {userItem.bloqueado ? (
                            <div className="inline-flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-red-700">Bloqueado</span>
                              <button
                                type="button"
                                onClick={() => handleUnlockUser(userItem.id, userItem.email)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-[10px] font-semibold rounded-md cursor-pointer"
                                title="Desbloquear usuario y generar contraseña temporal"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Desbloquear</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">Normal</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRoles(userItem)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
                            title="Configurar roles y permisos por módulo"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                            <span>Permisos</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- PESTAÑA: ROLES DEL SISTEMA --- */}
      {activeTab === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Lista de Roles */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h3 className="text-xs font-semibold text-slate-800">Roles</h3>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-semibold rounded-md border border-slate-300 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Nuevo Rol</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
              {roles.map((rol) => {
                const isSelected = selectedRole?.id === rol.id;
                const roleMods = getDefaultModulePermissionsForRoles([rol.nombre]);
                const modCount = Object.keys(roleMods).length;

                return (
                  <button
                    key={rol.id}
                    type="button"
                    onClick={() => handleRoleSelect(rol)}
                    className={`w-full px-4 py-3 text-left transition-colors flex items-center justify-between gap-2 group cursor-pointer ${
                      isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold truncate ${
                            isSelected ? 'text-slate-950' : 'text-slate-800'
                          }`}
                        >
                          {rol.nombre}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">
                          ({rol.usuarioCount})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {rol.descripcion || ROLE_SUBTITLES[rol.nombre.toUpperCase()] || 'Rol personalizado'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-medium text-slate-500 tabular-nums">
                        {rol.nombre === 'ADMIN' ? `${ERP_MODULES_CATALOG.length} mód.` : `${modCount} mód.`}
                      </span>
                      {rol.nombre !== 'ADMIN' && (
                        <span
                          onClick={(e) => handleDeleteRole(e, rol.id, rol.nombre)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Eliminar rol"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalle del rol seleccionado */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 flex flex-col min-w-0">
            {selectedRole ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Rol: {selectedRole.nombre}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedRole.descripcion || ROLE_SUBTITLES[selectedRole.nombre.toUpperCase()] || 'Perfil de acceso del ERP'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className="px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
                    >
                      Marcar todos
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllPermissions}
                      className="px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
                    >
                      Limpiar
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePermissions}
                      disabled={isSubmitLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1B1D22] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Guardar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Resumen de los 20 módulos predeterminados para este rol */}
                {(() => {
                  const defaultRoleMap = getDefaultModulePermissionsForRoles([selectedRole.nombre]);
                  const enabledModules = ERP_MODULES_CATALOG.filter((m) => Boolean(defaultRoleMap[m.id]));
                  return (
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-900">
                            Módulos habilitados por defecto ({enabledModules.length} de {ERP_MODULES_CATALOG.length})
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Para asignar módulos puntuales con nivel Solo ver o Escribir a una persona específica, usa la pestaña Usuarios.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('users')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-[11px] font-semibold cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                          <span>Configurar por usuario</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {enabledModules.length > 0 ? (
                          enabledModules.map((mod) => (
                            <span
                              key={mod.id}
                              className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[11px] font-medium text-slate-700"
                            >
                              {mod.nombre}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Sin módulos predeterminados. Configura sus accesos en la pestaña Usuarios.
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {matrixMsg && (
                  <div
                    className={`px-3.5 py-2.5 rounded-lg text-xs border ${
                      matrixMsg.type === 'success'
                        ? 'bg-slate-50 border-slate-300 text-slate-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    {matrixMsg.text}
                  </div>
                )}

                {/* Permisos técnicos del rol */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Permisos registrados del rol ({selectedPermIds.length} de {permissions.length})
                  </p>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
                    {permissions.map((perm) => {
                      const isChecked = selectedPermIds.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-50/70 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handlePermissionToggle(perm.id)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <span className="block font-mono text-xs font-semibold text-slate-900">
                                {perm.codigo}
                              </span>
                              {perm.descripcion && (
                                <span className="block text-[11px] text-slate-500 truncate">
                                  {perm.descripcion}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500 shrink-0">
                            {isChecked ? 'Activo' : 'Inactivo'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 text-xs text-slate-400">
                Selecciona un rol de la lista para ver sus detalles.
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: CREAR NUEVO ROL --- */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Crear Rol</h3>
                <p className="text-[11px] text-slate-500">Define un perfil adicional para tu equipo.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setNewRoleName('');
                  setNewRoleDesc('');
                  setRoleError(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-5 space-y-4">
              {roleError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
                  {roleError}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Nombre del Rol</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Ej. AUXILIAR_BODEGA"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700">Descripción (Opcional)</label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Ej. Apoyo operativo en bodega"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsRoleModalOpen(false);
                    setNewRoleName('');
                    setNewRoleDesc('');
                    setRoleError(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading || newRoleName.trim() === ''}
                  className="px-4 py-1.5 bg-[#1B1D22] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitLoading ? 'Guardando...' : 'Crear Rol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: REGISTRAR NUEVO USUARIO --- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-4 h-4 text-slate-700" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Nuevo Usuario</h3>
                  <p className="text-[11px] text-slate-500">
                    Registra las credenciales, asigna un rol base y define los módulos permitidos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUserModalOpen(false);
                  setCreatePersonalized(false);
                  setCreateModulePerms({});
                  reset();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmitUser, (errs) => console.log('Errores de validación:', errs))}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {modalError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Datos básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">Nombre</label>
                    <input
                      type="text"
                      {...register('nombre')}
                      placeholder="Ej. Juan"
                      className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 ${
                        errors.nombre ? 'border-red-400' : 'border-slate-300'
                      }`}
                    />
                    {errors.nombre && <p className="text-[11px] text-red-600">{errors.nombre.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">Apellido</label>
                    <input
                      type="text"
                      {...register('apellido')}
                      placeholder="Ej. Pérez"
                      className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 ${
                        errors.apellido ? 'border-red-400' : 'border-slate-300'
                      }`}
                    />
                    {errors.apellido && <p className="text-[11px] text-red-600">{errors.apellido.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">Correo Electrónico</label>
                    <input
                      type="email"
                      {...register('email')}
                      placeholder="nombre@bmconstrucciones.com"
                      className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 ${
                        errors.email ? 'border-red-400' : 'border-slate-300'
                      }`}
                    />
                    {errors.email && <p className="text-[11px] text-red-600">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">Contraseña Temporal</label>
                    <input
                      type="password"
                      {...register('password')}
                      placeholder="Mínimo 6 caracteres"
                      className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 ${
                        errors.password ? 'border-red-400' : 'border-slate-300'
                      }`}
                    />
                    {errors.password && <p className="text-[11px] text-red-600">{errors.password.message}</p>}
                  </div>
                </div>

                {/* Selección sobria de Rol Base */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex items-baseline justify-between">
                    <label className="text-xs font-semibold text-slate-900">
                      Rol base ({roles.length} disponibles)
                    </label>
                    <span className="text-[11px] text-slate-500">Selecciona al menos uno</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50 max-h-[156px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {roles.map((rol) => {
                      const isChecked = watchedCreateRoleIds.includes(rol.id);
                      const subtitle =
                        rol.descripcion || ROLE_SUBTITLES[rol.nombre.toUpperCase()] || 'Rol personalizado';
                      return (
                        <label
                          key={rol.id}
                          className={`flex items-start gap-2.5 px-3 py-2 rounded-md border transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-white border-slate-900 shadow-2xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            value={rol.id}
                            {...register('roles')}
                            className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="block text-[11px] font-semibold text-slate-900 leading-tight truncate">
                              {rol.nombre}
                            </span>
                            <span className="block text-[10px] text-slate-500 truncate mt-0.5">
                              {subtitle}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {errors.roles && <p className="text-[11px] text-red-600">{errors.roles.message}</p>}
                </div>

                {/* Matriz granular de los 20 módulos */}
                <div className="border-t border-slate-100 pt-4">
                  <ModulePermissionsMatrix
                    personalized={createPersonalized}
                    onPersonalizedChange={setCreatePersonalized}
                    value={createModulePerms}
                    onChange={setCreateModulePerms}
                    selectedRoleNames={createSelectedRoleNames}
                    disabled={isSubmitLoading}
                  />
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserModalOpen(false);
                    setCreatePersonalized(false);
                    setCreateModulePerms({});
                    reset();
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="px-5 py-2 bg-[#1B1D22] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Registrar Usuario</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: USUARIO DESBLOQUEADO --- */}
      {unlockedPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xl max-w-sm w-full space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Usuario Desbloqueado</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{unlockedUserEmail}</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Entrega esta contraseña temporal al colaborador. El sistema solicitará cambiarla en su próximo inicio de sesión.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-center justify-between font-mono">
              <span className="text-sm font-bold text-slate-900 tracking-wider">
                {unlockedPassword}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(unlockedPassword);
                  alert('Contraseña temporal copiada al portapapeles.');
                }}
                className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Copiar contraseña"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setUnlockedPassword(null)}
              className="w-full py-2 bg-[#1B1D22] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Aceptar y Cerrar
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIGURAR ROLES Y MÓDULOS DE USUARIO --- */}
      {isEditRolesModalOpen && userToEditRoles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[2px]">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Permisos de {userToEditRoles.nombre} {userToEditRoles.apellido}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{userToEditRoles.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditRolesModalOpen(false);
                  setUserToEditRoles(null);
                  setEditRolesError(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {editRolesError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{editRolesError}</span>
                </div>
              )}

              {/* Selección sobria de Roles */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-900">Rol base asignado</p>
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50 max-h-[156px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {roles.map((rol) => {
                    const isChecked = editingRoleIds.includes(rol.id);
                    const subtitle =
                      rol.descripcion || ROLE_SUBTITLES[rol.nombre.toUpperCase()] || 'Rol personalizado';
                    return (
                      <label
                        key={rol.id}
                        className={`flex items-start gap-2.5 px-3 py-2 rounded-md border transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-white border-slate-900 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEditRole(rol.id)}
                          className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block text-[11px] font-semibold text-slate-900 leading-tight truncate">
                            {rol.nombre}
                          </span>
                          <span className="block text-[10px] text-slate-500 truncate mt-0.5">
                            {subtitle}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Matriz granular de los 20 módulos */}
              <div className="border-t border-slate-100 pt-4">
                <ModulePermissionsMatrix
                  personalized={editingPersonalized}
                  onPersonalizedChange={setEditingPersonalized}
                  value={editingModulePerms}
                  onChange={setEditingModulePerms}
                  selectedRoleNames={editSelectedRoleNames}
                  disabled={isSubmitLoading}
                />
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsEditRolesModalOpen(false);
                  setUserToEditRoles(null);
                  setEditRolesError(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveUserRoles}
                disabled={isSubmitLoading}
                className="px-5 py-2 bg-[#1B1D22] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Permisos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
