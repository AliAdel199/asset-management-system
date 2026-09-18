"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api-client";
import styles from "./page.module.css";

type OrganizationUnitRow = {
  id: string;
  name: string;
  code: string;
  unitType: string;
  isActive: boolean;
  parentId: string | null;
  parent: { id: string; name: string; code: string } | null;
  _count: { children: number; users: number; ownedAssets: number };
};

type FormState = {
  name: string;
  code: string;
  unitType: string;
  parentId: string;
  isActive: boolean;
};

function emptyForm(): FormState {
  return { name: "", code: "", unitType: "", parentId: "", isActive: true };
}

export function AdminOrganizationUnitsPanel() {
  const [units, setUnits] = useState<OrganizationUnitRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");

  const loadUnits = useCallback(async () => {
    const response = await apiFetch("/organization-units");

    if (response.ok) {
      setUnits(await response.json());
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      try {
        await loadUnits();
      } catch {
        if (!ignore) {
          setMessage("تعذر تحميل الهيكل الإداري.");
        }
      }
    }

    void initialLoad();

    return () => {
      ignore = true;
    };
  }, [loadUnits]);

  function startEdit(unit: OrganizationUnitRow) {
    setEditingId(unit.id);
    setForm({
      name: unit.name,
      code: unit.code,
      unitType: unit.unitType,
      parentId: unit.parentId ?? "",
      isActive: unit.isActive,
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const payload = {
        name: form.name,
        code: form.code,
        unitType: form.unitType,
        parentId: form.parentId || null,
        isActive: form.isActive,
      };

      const response = await apiFetch(
        editingId ? `/organization-units/${editingId}` : "/organization-units",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر حفظ بيانات الجهة.");
      }

      await loadUnits();
      setMessage(editingId ? "تم تحديث بيانات الجهة." : "تم إنشاء الجهة.");
      setTone("success");
      cancelEdit();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر حفظ بيانات الجهة.",
      );
      setTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(unit: OrganizationUnitRow) {
    if (!window.confirm(`هل تريد حذف "${unit.name}" نهائياً؟`)) {
      return;
    }

    setMessage("");

    try {
      const response = await apiFetch(`/organization-units/${unit.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر حذف الجهة.");
      }

      await loadUnits();
      setMessage("تم حذف الجهة.");
      setTone("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حذف الجهة.");
      setTone("error");
    }
  }

  return (
    <section className={styles.assetsWorkspace}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>الهيكل الإداري</p>
          <h3>{editingId ? "تعديل جهة" : "إضافة قسم / شعبة جديدة"}</h3>
        </div>
      </div>

      {message && <p className={`${styles.notice} ${styles[tone]}`}>{message}</p>}

      <form className={styles.assetForm} onSubmit={handleSubmit}>
        <label>
          اسم الجهة
          <input
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            required
            type="text"
            value={form.name}
          />
        </label>

        <label>
          رمز الجهة
          <input
            onChange={(event) =>
              setForm((current) => ({ ...current, code: event.target.value }))
            }
            required
            type="text"
            value={form.code}
          />
        </label>

        <label>
          نوع الجهة (قسم، شعبة، مستشفى...)
          <input
            onChange={(event) =>
              setForm((current) => ({ ...current, unitType: event.target.value }))
            }
            required
            type="text"
            value={form.unitType}
          />
        </label>

        <label>
          الجهة الأعلى
          <select
            onChange={(event) =>
              setForm((current) => ({ ...current, parentId: event.target.value }))
            }
            value={form.parentId}
          >
            <option value="">بدون جهة أعلى (جذر)</option>
            {units
              .filter((unit) => unit.id !== editingId)
              .map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.code})
                </option>
              ))}
          </select>
        </label>

        <label className={styles.checkboxLabel}>
          <input
            checked={form.isActive}
            onChange={(event) =>
              setForm((current) => ({ ...current, isActive: event.target.checked }))
            }
            type="checkbox"
          />
          جهة فعالة
        </label>

        <div className={styles.formActions}>
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? "جاري الحفظ" : editingId ? "حفظ التعديلات" : "إضافة الجهة"}
          </button>
          {editingId && (
            <button onClick={cancelEdit} type="button">
              إلغاء
            </button>
          )}
        </div>
      </form>

      <div className={styles.assetsTableWrap}>
        <table className={styles.assetsTable}>
          <thead>
            <tr>
              <th>الجهة</th>
              <th>الرمز</th>
              <th>النوع</th>
              <th>الجهة الأعلى</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id}>
                <td>{unit.name}</td>
                <td>{unit.code}</td>
                <td>{unit.unitType}</td>
                <td>{unit.parent ? unit.parent.name : "—"}</td>
                <td>
                  {unit.isActive ? (
                    <span className={styles.statusOpen}>فعالة</span>
                  ) : (
                    <span className={styles.statusCancelled}>معطلة</span>
                  )}
                </td>
                <td>
                  <button
                    className={styles.tableActionButton}
                    onClick={() => startEdit(unit)}
                    type="button"
                  >
                    تعديل
                  </button>
                  <button
                    className={styles.tableActionButton}
                    onClick={() => handleDelete(unit)}
                    type="button"
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
            {units.length === 0 && (
              <tr>
                <td colSpan={6}>لا توجد جهات مسجلة بعد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
