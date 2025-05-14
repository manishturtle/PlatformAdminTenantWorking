export interface FieldPermission {
  fieldName: string;
  read: boolean;
  edit: boolean;
}

export interface ModulePermission {
  moduleName: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  fieldPermissions: FieldPermission[];
}

export interface Role {
  id?: string;
  name: string;
  status: 'active' | 'inactive';
  description: string;
  modulePermissions: ModulePermission[];
  users?: number;
  lastModified?: Date; // Add last modified timestamp
}

export interface RoleFormProps {
  initialRole?: Role;
  modules: string[];
  onSave: (role: Role) => void;
  onCancel: () => void;
}

export interface RoleListProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (roleId: string) => void;
  onCreateNew: () => void;
}
