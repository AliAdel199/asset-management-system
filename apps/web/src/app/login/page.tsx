"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";
import styles from "../page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const formData = new FormData(event.currentTarget);

    try {
      await login(
        String(formData.get("username") ?? ""),
        String(formData.get("password") ?? ""),
      );
      router.replace("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر تسجيل الدخول.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.loginScreen}>
      <form className={styles.loginCard} onSubmit={handleSubmit}>
        <div>
          <p className={styles.eyebrow}>نظام إدارة الموجودات</p>
          <h1>تسجيل الدخول</h1>
        </div>
        <label>
          اسم المستخدم
          <input autoFocus name="username" required type="text" />
        </label>
        <label>
          كلمة المرور
          <input name="password" required type="password" />
        </label>
        {error && <p className={styles.loginError}>{error}</p>}
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "جاري الدخول" : "دخول"}
        </button>
      </form>
    </div>
  );
}
