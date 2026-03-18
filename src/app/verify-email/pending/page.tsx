import Link from "next/link";

export const metadata = { title: "Проверьте почту — Vaulty" };

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B1120] px-4 grid-bg">
      <img src="/logo.png" alt="Vaulty" className="h-12 w-12 rounded-2xl object-cover mb-6" style={{ boxShadow: "0 8px 32px rgba(245,158,11,0.2)" }} />

      <div className="w-full max-w-sm rounded-2xl border border-[#1C2640] bg-[#0E1830] p-8 text-center">
        <div className="text-4xl mb-4">📬</div>
        <h2 className="fb text-lg font-bold text-[#E8F0FF] mb-2">Проверьте вашу почту</h2>
        <p className="fm text-sm text-[#4E6080] leading-relaxed mb-6">
          Мы отправили письмо с ссылкой для подтверждения.
          Перейдите по ней, чтобы активировать аккаунт.
        </p>
        <p className="fm text-xs text-[#2A3A50] leading-relaxed mb-6">
          Письмо может попасть в спам. Если SMTP не настроен —
          ссылка выводится в консоль сервера.
        </p>
        <Link
          href="/login"
          className="fm block w-full rounded-lg border border-[#1C2640] bg-[#080F1C] py-2.5 text-sm font-medium text-[#4E6080] transition-colors hover:border-[#3E5070] hover:text-[#E8F0FF]"
        >
          Уже подтвердил → Войти
        </Link>
      </div>
    </div>
  );
}
