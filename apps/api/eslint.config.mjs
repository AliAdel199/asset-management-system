// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    // اختبارات الوحدة تبني كائنات mock بسيطة عبر `as any` عمداً بدل تكرار الأنواع الضخمة
    // المولّدة من Prisma، واختبارات e2e تتعامل مع استجابات supertest غير المُصنّفة (`any`)
    // - هذا نمط شائع ومقبول لملفات الاختبار وأدواتها المساعدة تحديداً.
    files: ['**/*.spec.ts', 'test/**/*.ts', 'src/test-mocks/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // src/test-mocks يحتاج `import x = require(...)` تحديداً لضمان الحصول على نفس
      // القيمة التي يرجعها require() دون التباس interop، وهذا ضروري هنا لا مجرد أسلوب.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
