import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * يعفي المسار من فحص تسجيل الدخول (يُستخدم فقط لمسار تسجيل الدخول نفسه).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
