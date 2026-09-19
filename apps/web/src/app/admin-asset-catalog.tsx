"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api-client";
import styles from "./page.module.css";

type AssetType = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

type AssetCategory = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  assetTypes: AssetType[];
  _count: { assets: number };
};

type CategoryFormState = {
  name: string;
  description: string;
  isActive: boolean;
};

type TypeFormState = {
  categoryId: string;
  name: string;
  description: string;
  isActive: boolean;
};

function emptyCategoryForm(): CategoryFormState {
  return { name: "", description: "", isActive: true };
}

function emptyTypeForm(categoryId: string): TypeFormState {
  return { categoryId, name: "", description: "", isActive: true };
}

export function AdminAssetCatalogPanel() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [categoryEditingId, setCategoryEditingId] = useState<string | null>(
    null,
  );
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(
    emptyCategoryForm(),
  );
  const [typeEditingId, setTypeEditingId] = useState<string | null>(null);
  const [typeForm, setTypeForm] = useState<TypeFormState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");

  const loadCategories = useCallback(async () => {
    const response = await apiFetch("/asset-catalog");

    if (response.ok) {
      setCategories(await response.json());
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      try {
        await loadCategories();
      } catch {
        if (!ignore) {
          setMessage("تعذر تحميل أصناف الموجودات.");
        }
      }
    }

    void initialLoad();

    return () => {
      ignore = true;
    };
  }, [loadCategories]);

  function startEditCategory(category: AssetCategory) {
    setCategoryEditingId(category.id);
    setCategoryForm({
      name: category.name,
      description: category.description ?? "",
      isActive: category.isActive,
    });
    setMessage("");
  }

  function cancelEditCategory() {
    setCategoryEditingId(null);
    setCategoryForm(emptyCategoryForm());
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await apiFetch(
        categoryEditingId
          ? `/asset-catalog/categories/${categoryEditingId}`
          : "/asset-catalog/categories",
        {
          method: categoryEditingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryForm),
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر حفظ الصنف.");
      }

      await loadCategories();
      setMessage(categoryEditingId ? "تم تحديث الصنف." : "تم إنشاء الصنف.");
      setTone("success");
      cancelEditCategory();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الصنف.");
      setTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteCategory(category: AssetCategory) {
    if (!window.confirm(`هل تريد حذف صنف "${category.name}" نهائياً؟`)) {
      return;
    }

    setMessage("");

    try {
      const response = await apiFetch(
        `/asset-catalog/categories/${category.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر حذف الصنف.");
      }

      await loadCategories();
      setMessage("تم حذف الصنف.");
      setTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حذف الصنف.");
      setTone("error");
    }
  }

  function startAddType(categoryId: string) {
    setTypeEditingId(null);
    setTypeForm(emptyTypeForm(categoryId));
    setMessage("");
  }

  function startEditType(categoryId: string, assetType: AssetType) {
    setTypeEditingId(assetType.id);
    setTypeForm({
      categoryId,
      name: assetType.name,
      description: assetType.description ?? "",
      isActive: assetType.isActive,
    });
    setMessage("");
  }

  function cancelTypeForm() {
    setTypeEditingId(null);
    setTypeForm(null);
  }

  async function handleTypeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!typeForm) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await apiFetch(
        typeEditingId
          ? `/asset-catalog/types/${typeEditingId}`
          : `/asset-catalog/categories/${typeForm.categoryId}/types`,
        {
          method: typeEditingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: typeForm.name,
            description: typeForm.description,
            isActive: typeForm.isActive,
          }),
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر حفظ نوع المادة.");
      }

      await loadCategories();
      setMessage(typeEditingId ? "تم تحديث نوع المادة." : "تم إضافة نوع المادة.");
      setTone("success");
      cancelTypeForm();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر حفظ نوع المادة.",
      );
      setTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteType(assetType: AssetType) {
    if (!window.confirm(`هل تريد حذف نوع المادة "${assetType.name}" نهائياً؟`)) {
      return;
    }

    setMessage("");

    try {
      const response = await apiFetch(`/asset-catalog/types/${assetType.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر حذف نوع المادة.");
      }

      await loadCategories();
      setMessage("تم حذف نوع المادة.");
      setTone("success");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر حذف نوع المادة.",
      );
      setTone("error");
    }
  }

  return (
    <section className={styles.assetsWorkspace}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>أصناف الموجودات</p>
          <h3>{categoryEditingId ? "تعديل صنف" : "إضافة صنف جديد"}</h3>
          {!categoryEditingId && (
            <p>يولّد النظام رمز الصنف تلقائياً بدون تكرار.</p>
          )}
        </div>
      </div>

      {message && <p className={`${styles.notice} ${styles[tone]}`}>{message}</p>}

      <form className={styles.assetForm} onSubmit={handleCategorySubmit}>
        <label>
          اسم الصنف
          <input
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            required
            type="text"
            value={categoryForm.name}
          />
        </label>

        <label className={styles.fullWidth}>
          الوصف
          <input
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            type="text"
            value={categoryForm.description}
          />
        </label>

        <label className={styles.checkboxLabel}>
          <input
            checked={categoryForm.isActive}
            onChange={(event) =>
              setCategoryForm((current) => ({
                ...current,
                isActive: event.target.checked,
              }))
            }
            type="checkbox"
          />
          صنف فعال
        </label>

        <div className={styles.formActions}>
          <button disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "جاري الحفظ"
              : categoryEditingId
                ? "حفظ التعديلات"
                : "إضافة الصنف"}
          </button>
          {categoryEditingId && (
            <button onClick={cancelEditCategory} type="button">
              إلغاء
            </button>
          )}
        </div>
      </form>

      {categories.map((category) => (
        <section className={styles.assetsWorkspace} key={category.id}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>{category.code}</p>
              <h3>{category.name}</h3>
            </div>
            <span>
              {category.isActive ? "فعال" : "معطل"} - {category._count.assets} موجود
            </span>
          </div>

          <div className={styles.formActions}>
            <button
              className={styles.tableActionButton}
              onClick={() => startEditCategory(category)}
              type="button"
            >
              تعديل الصنف
            </button>
            <button
              className={styles.tableActionButton}
              onClick={() => handleDeleteCategory(category)}
              type="button"
            >
              حذف الصنف
            </button>
            <button
              className={styles.tableActionButton}
              onClick={() => startAddType(category.id)}
              type="button"
            >
              إضافة نوع مادة
            </button>
          </div>

          {typeForm && typeForm.categoryId === category.id && (
            <form className={styles.compactActionForm} onSubmit={handleTypeSubmit}>
              <input
                onChange={(event) =>
                  setTypeForm((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
                placeholder="اسم نوع المادة"
                required
                type="text"
                value={typeForm.name}
              />
              <input
                onChange={(event) =>
                  setTypeForm((current) =>
                    current
                      ? { ...current, description: event.target.value }
                      : current,
                  )
                }
                placeholder="وصف (اختياري)"
                type="text"
                value={typeForm.description}
              />
              <label className={styles.checkboxLabel}>
                <input
                  checked={typeForm.isActive}
                  onChange={(event) =>
                    setTypeForm((current) =>
                      current
                        ? { ...current, isActive: event.target.checked }
                        : current,
                    )
                  }
                  type="checkbox"
                />
                فعال
              </label>
              <button disabled={isSubmitting} type="submit">
                {typeEditingId ? "حفظ" : "إضافة"}
              </button>
              <button onClick={cancelTypeForm} type="button">
                إلغاء
              </button>
            </form>
          )}

          <div className={styles.assetsTableWrap}>
            <table className={styles.assetsTable}>
              <thead>
                <tr>
                  <th>نوع المادة</th>
                  <th>الوصف</th>
                  <th>الحالة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {category.assetTypes.map((assetType) => (
                  <tr key={assetType.id}>
                    <td>{assetType.name}</td>
                    <td>{assetType.description ?? "—"}</td>
                    <td>
                      {assetType.isActive ? (
                        <span className={styles.statusOpen}>فعال</span>
                      ) : (
                        <span className={styles.statusCancelled}>معطل</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={styles.tableActionButton}
                        onClick={() => startEditType(category.id, assetType)}
                        type="button"
                      >
                        تعديل
                      </button>
                      <button
                        className={styles.tableActionButton}
                        onClick={() => handleDeleteType(assetType)}
                        type="button"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
                {category.assetTypes.length === 0 && (
                  <tr>
                    <td colSpan={4}>لا توجد أنواع مواد لهذا الصنف بعد.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </section>
  );
}
