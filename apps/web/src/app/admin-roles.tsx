"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api-client";
import styles from "./page.module.css";

type Permission = {
  id: string;
  code: string;
  name: string;
  module: string;
};

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  scopeLevel: string;
  isActive: boolean;
  permissions: { permission: Permission }[];
  _count: { users: number };
};

type FormState = {
  name: string;
  description: string;
  scopeLevel: string;
  isActive: boolean;
  permissionCodes: string[];
};

const scopeLevelLabels: Record<string, string> = {
  central: "مركزي (كل الجهات)",
  unit: "جهة محددة",
  read_only: "قراءة فقط",
};

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    scopeLevel: "unit",
    isActive: true,
    permissionCodes: [],
  };
}

function groupByModule(permissions: Permission[]) {
  const groups = new Map<string, Permission[]>();

  for (const permission of permissions) {
    const list = groups.get(permission.module) ?? [];
    list.push(permission);
    groups.set(permission.module, list);
  }

  return Array.from(groups.entries());
}

export function AdminRolesPanel() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");

  const loadData = useCallback(async () => {
    const [rolesResponse, permissionsResponse] = await Promise.all([
      apiFetch("/roles"),
      apiFetch("/roles/permissions"),
    ]);

    if (rolesResponse.ok) {
      setRoles(await rolesResponse.json());
    }

    if (permissionsResponse.ok) {
      setPermissions(await permissionsResponse.json());
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      try {
        await loadData();
      } catch {
        if (!ignore) {
          setMessage("تعذر تحميل بيانات الأدوار.");
        }
      }
    }

    void initialLoad();

    return () => {
      ignore = true;
    };
  }, [loadData]);

  function startEdit(role: RoleRow) {
    setEditingId(role.id);
    setForm({
      name: role.name,
      description: role.description ?? "",
      scopeLevel: role.scopeLevel,
      isActive: role.isActive,
      permissionCodes: role.permissions.map((item) => item.permission.code),
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setMessage("");
  }

  function togglePermission(code: string) {
    setForm((current) => ({
      ...current,
      permissionCodes: current.permissionCodes.includes(code)
        ? current.permissionCodes.filter((item) => item !== code)
        : [...current.permissionCodes, code],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const payload = {
        name: form.name,
        description: form.description,
        scopeLevel: form.scopeLevel,
        isActive: form.isActive,
        permissionCodes: form.permissionCodes,
      };

      const response = await apiFetch(
        editingId ? `/roles/${editingId}` : "/roles",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر حفظ بيانات الدور.");
      }

      await loadData();
      setMessage(editingId ? "تم تحديث الدور وصلاحياته." : "تم إنشاء الدور.");
      setTone("success");
      cancelEdit();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر حفظ بيانات الدور.",
      );
      setTone("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.assetsWorkspace}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>إدارة الأدوار والصلاحيات</p>
          <h3>{editingId ? "تعديل دور" : "إضافة دور جديد"}</h3>
        </div>
      </div>

      {message && <p className={`${styles.notice} ${styles[tone]}`}>{message}</p>}

      <form className={styles.assetForm} onSubmit={handleSubmit}>
        <label>
          اسم الدور
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
          نطاق الدور
          <select
            onChange={(event) =>
              setForm((current) => ({ ...current, scopeLevel: event.target.value }))
            }
            value={form.scopeLevel}
          >
            {Object.entries(scopeLevelLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.fullWidth}>
          وصف الدور
          <input
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            type="text"
            value={form.description}
          />
        </label>

        <label className={styles.checkboxLabel}>
          <input
            checked={form.isActive}
            onChange={(event) =>
              setForm((current) => ({ ...current, isActive: event.target.checked }))
            }
            type="checkbox"
          />
          دور فعال
        </label>

        <div className={styles.formDivider}>
          <strong>الصلاحيات</strong>
          <span>حدد الصلاحيات التي يمنحها هذا الدور لأي مستخدم مرتبط به.</span>
        </div>

        {groupByModule(permissions).map(([module, modulePermissions]) => (
          <div className={styles.fullWidth} key={module}>
            <p className={styles.formHint}>{module}</p>
            <div className={styles.permissionsGrid}>
              {modulePermissions.map((permission) => (
                <label className={styles.checkboxLabel} key={permission.id}>
                  <input
                    checked={form.permissionCodes.includes(permission.code)}
                    onChange={() => togglePermission(permission.code)}
                    type="checkbox"
                  />
                  {permission.name}
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className={styles.formActions}>
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? "جاري الحفظ" : editingId ? "حفظ التعديلات" : "إضافة الدور"}
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
              <th>الدور</th>
              <th>النطاق</th>
              <th>عدد المستخدمين</th>
              <th>عدد الصلاحيات</th>
              <th>الحالة</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td>{scopeLevelLabels[role.scopeLevel] ?? role.scopeLevel}</td>
                <td>{role._count.users}</td>
                <td>{role.permissions.length}</td>
                <td>
                  {role.isActive ? (
                    <span className={styles.statusOpen}>فعال</span>
                  ) : (
                    <span className={styles.statusCancelled}>معطل</span>
                  )}
                </td>
                <td>
                  <button
                    className={styles.tableActionButton}
                    onClick={() => startEdit(role)}
                    type="button"
                  >
                    تعديل
                  </button>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={6}>لا توجد أدوار معرفة بعد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
