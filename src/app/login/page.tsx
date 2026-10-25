"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "../../components/ui/button";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const form = new FormData(event.currentTarget);
      const result = await signIn("credentials", {
        email: form.get("email"),
        password: form.get("password"),
        redirect: false,
      });
      if (!result?.ok || result.error) {
        setError("Email atau password salah, atau layanan login sedang tidak tersedia.");
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setError("Layanan login sedang tidak tersedia. Coba lagi sebentar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth [min-height:100vh] [display:grid] [place-items:center] [padding:24px] [background:radial-gradient(_ellipse_at_50%_22%,_#31291d,_#17181d_48%,_#111318_)] [&_form]:[width:min(100%,_420px)] [&_form]:[display:grid] [&_form]:[gap:14px] [&_form]:[padding:30px] [&_form]:[border:1px_solid_#5a4a32] [&_form]:[border-radius:9px] [&_form]:[background:linear-gradient(145deg,_#22232a,_#191a1f)] [&_form]:[box-shadow:0_22px_70px_#0006] [&_h1]:[margin:0_0_7px] [&_h1]:[color:#f1dfbc] [&_h1]:[font:500_30px_var(--serif)] [&_label]:[display:grid] [&_label]:[gap:7px] [&_label]:[color:#cfc2ab] [&_label]:[font-size:12px] [&_input]:[min-height:39px] [&_input]:[padding:9px_10px] [&_input]:[border:1px_solid_#494950] [&_input]:[border-radius:5px] [&_input]:[background:#15171c] [&_input]:[color:#eee4d2] [&_button]:[min-height:40px] [&_button]:[border:1px_solid_#806844] [&_button]:[border-radius:5px] [&_button]:[background:linear-gradient(180deg,_#8b6a3e,_#6b4f2e)] [&_button]:[color:#fff0d5] [&_button]:[font-weight:700] [&_a]:[color:#d7bb88] [&_a]:[font-size:11px] [&_a]:[text-decoration:none] [&_a:hover]:[text-decoration:underline] [&_[role='alert']]:[margin:0] [&_[role='alert']]:[color:#f1aaa1] [&_[role='alert']]:[font-size:12px]">
      <form onSubmit={handleSubmit}>
        <h1>Masuk</h1>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p role="alert">{error}</p>}
        <Button className="min-h-10" disabled={submitting}>{submitting ? "Memeriksa…" : "Masuk"}</Button>
        <a href="/register">Buat akun</a>
        <a href="/reset-password">Lupa password?</a>
      </form>
    </main>
  );
}
