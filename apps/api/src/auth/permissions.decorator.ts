import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';

/**
 * يحدد أكواد الصلاحيات المطلوبة لتنفيذ المسار؛ يكفي أن تتوفر صلاحية واحدة منها.
 */
export const RequirePermissions = (...codes: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, codes);
