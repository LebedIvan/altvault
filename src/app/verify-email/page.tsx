import Link from "next/link";

export const metadata = { title: "Подтверждение email — Vaulty" };

interface Props {
  searchParams: { error?: string };
}

export default function Page({ searchParams }: Props) {
  const isError = !!searchParams.error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B1120] px-4 grid-bg">
      <img src="/logo.png" alt="Vaulty" className="h-12 w-12 rounded-2xl object-cover mb-6" style={{ boxShadow: "0 8px 32px rgba(245,158,11,0.2)" }} />

      <div className="w-full max-w-sm rounded-2xl border border-[#1C2640] bg-[#0E1830] p-8 text-center">
        {isError ? (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="fb text-lg font-bold text-[#E8F0FF] mb-2">Ссылка недействительна</h2>
            <p className="fm text-sm text-[#4E6080] leading-relaxed mb-6">
              Возможно, ссылка уже использована или истекла.
              Попробуйте войти — мы отправим новое письмо.
            </p>
          </>
        ) : (
          <>
            <div className="text-4xl mb-4">📧</div>
            <h2 className="fb text-lg font-bold text-[#E8F0FF] mb-2">Проверьте почту</h2>
            <p className="fm text-sm text-[#4E6080] leading-relaxed mb-6">
              Мы отправили письмо с подтверждением. Перейдите по ссылке в письме, чтобы активировать аккаунт.
            </p>
          </>
        )}
        <Link
          href="/login"
          className="fm block w-full rounded-lg bg-[#F59E0B] py-2.5 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#FCD34D] uppercase tracking-wider"
        >
          Войти
        </Link>
      </div>
    </div>
  );
}
