export type AuthenticatedUser = {
  id: string;
  fullName: string;
  username: string;
  organizationUnitId: string;
  permissions: Set<string>;
  // null = بلا قيد (صلاحية مركزية تشمل كل الجهات)، وإلا قائمة معرفات الجهات المسموح رؤية بياناتها.
  allowedOrganizationUnitIds: string[] | null;
};
