export interface Module {
  id: number;
  name: string;
  key: string;
  description?: string;
}

export interface ModulePermission {
  moduleName: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  fieldPermissions: {
    fieldName: string;
    read: boolean;
    edit: boolean;
  }[];
}
