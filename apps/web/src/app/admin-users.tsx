"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "./api-client";
import styles from "./page.module.css";

type OrganizationUnit = {
  id: string;
  name: string;
  code: string;
};

type Role = {
  id: string;
  name: string;
  scopeLevel: string;
  isActive: boolean;
};

type UserRow = {
  id: string;
  fullName: string;
  username: string;
  isActive: boolean;
  lastLoginAt: string | null;
  organizationUnit: OrganizationUnit;
  roles: { id: string; role: Role }[];
};

type FormState = {
  fullName: string;
  username: string;
  password: string;
  organizationUnitId: string;
  isActive: boolean;
  roleIds: string[];
};

function emptyForm(defaultOrgUnitId: string): FormState {
  return {
    fullName: "",
    username: "",
    password: "",
    organizationUnitId: defaultOrgUnitId,
    isActive: true,
    roleIds: [],
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return "لم يسجل الدخول بعد";
  }

  return new Intl.DateTimeFormat("ar-IQ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizationUnits, setOrganizationUnits] = useState<
    OrganizationUnit[]
  >([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");

  const loadData = useCallback(async () => {
    const [usersResponse, rolesResponse, orgUnitsResponse] =
      await Promise.all([
        apiFetch("/users"),
        apiFetch("/roles"),
        apiFetch("/organization-units"),
      ]);

    if (usersResponse.ok) {
      setUsers(await usersResponse.json());
    }

    if (rolesResponse.ok) {
      setRoles(await rolesResponse.json());
    }

    if (orgUnitsResponse.ok) {
      const units = (await orgUnitsResponse.json()) as OrganizationUnit[];
      setOrganizationUnits(units);
      setForm((current) => ({
        ...current,
        organizationUnitId: current.organizationUnitId || units[0]?.id || "",
      }));
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      try {
        await loadData();
      } catch {
        if (!ignore) {
          setMessage("تعذر تحميل بيانات المستخدمين.");
        }
      }
    }

    void initialLoad();

    return () => {
      ignore = true;
    };
  }, [loadData]);

  function startEdit(user: UserRow) {
    setEditingId(user.id);
    setForm({
      fullName: user.fullName,
      username: user.username,
      password: "",
      organizationUnitId: user.organizationUnit.id,
      isActive: user.isActive,
      roleIds: user.roles.map((userRole) => userRole.role.id),
    });
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm(organizationUnits[0]?.id ?? ""));
    setMessage("");
  }

  function toggleRole(roleId: string) {
    setForm((current) => ({
      ...current,
      roleIds: current.roleIds.includes(roleId)
        ? current.roleIds.filter((id) => id !== roleId)
        : [...current.roleIds, roleId],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId && form.password.trim().length < 8) {
      setMessage("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      setTone("error");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName,
        organizationUnitId: form.organizationUnitId,
        isActive: form.isActive,
        roleIds: form.roleIds,
      };

      if (!editingId) {
        payload.username = form.username;
        payload.password = form.password;
      } else if (form.password.trim().length > 0) {
        payload.password = form.password;
      }

      const response = await apiFetch(
        editingId ? `/users/${editingId}` : "/users",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message ?? "تعذر حفظ بيانات المستخدم.");
      }

      await loadData();
      setMessage(editingId ? "تم تحديث بيانات المستخدم." : "تم إنشاء المستخدم.");
      setTone("success");
      cancelEdit();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذر حفظ بيانات المستخدم.",
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
          <p className={styles.eyebrow}>إدارة المستخدمين</p>
          <h3>{editingId ? "تعديل مستخدم" : "إضافة مستخدم جديد"}</h3>
        </div>
      </div>

      {message && <p className={`${styles.notice} ${styles[tone]}`}>{message}</p>}

      <form className={styles.assetForm} onSubmit={handleSubmit}>
        <label>
          الاسم الكامل
          <input
            onChange={(event) =>
              setForm((current) => ({ ...current, fullName: event.target.value }))
            }
            required
            type="text"
            value={form.fullName}
          />
        </label>

        <label>
          اسم المستخدم
          <input
            disabled={Boolean(editingId)}
            onChange={(event) =>
              setForm((current) => ({ ...current, username: event.target.value }))
            }
            required
            type="text"
            value={form.username}
          />
        </label>

        <label>
          {editingId ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"}
          <input
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            required={!editingId}
            type="password"
            value={form.password}
          />
        </label>

        <label>
          الجهة التنظيمية
          <select
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                organizationUnitId: event.target.value,
              }))
            }
            required
            value={form.organizationUnitId}
          >
            {organizationUnits.map((unit) => (
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
          مستخدم فعال
        </label>

        <div className={styles.formDivider}>
          <strong>الأدوار والصلاحيات</strong>
          <span>اختر دورًا أو أكثر لتحديد صلاحيات المستخدم.</span>
        </div>

        <div className={styles.permissionsGrid}>
          {roles.map((role) => (
            <label className={styles.checkboxLabel} key={role.id}>
              <input
                checked={form.roleIds.includes(role.id)}
                onChange={() => toggleRole(role.id)}
                type="checkbox"
              />
              {role.name}
              {!role.isActive && " (معطل)"}
            </label>
          ))}
        </div>

        <div className={styles.formActions}>
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? "جاري الحفظ" : editingId ? "حفظ التعديلات" : "إضافة المستخدم"}
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
              <th>الاسم الكامل</th>
              <th>اسم المستخدم</th>
              <th>الجهة</th>
              <th>الأدوار</th>
              <th>الحالة</th>
              <th>آخر دخول</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td>{user.username}</td>
                <td>{user.organizationUnit.name}</td>
                <td>{user.roles.map((userRole) => userRole.role.name).join("، ") || "بدون دور"}</td>
                <td>
                  {user.isActive ? (
                    <span className={styles.statusOpen}>فعال</span>
                  ) : (
                    <span className={styles.statusCancelled}>معطل</span>
                  )}
                </td>
                <td>{formatDate(user.lastLoginAt)}</td>
                <td>
                  <button
                    className={styles.tableActionButton}
                    onClick={() => startEdit(user)}
                    type="button"
                  >
                    تعديل
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7}>لا يوجد مستخدمون مسجلون بعد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
