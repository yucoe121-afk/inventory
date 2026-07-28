import { createClient } from "@supabase/supabase-js";

// 마스터키(service_role)를 쓰는 접속 통로.
// 이 키는 로그인도 RLS도 전부 무시하므로, 서버 안에서만 열려야 한다.
//
// 아래 두 개가 안전장치다.
//   1) 실수로 화면(브라우저) 코드에서 불러 쓰면 그 자리에서 에러를 낸다
//   2) 키 이름에 NEXT_PUBLIC_ 이 없으므로 Next.js 가 브라우저로 내려보내지 않는다
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("supabase-admin 은 서버에서만 사용할 수 있습니다.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 가 없습니다. .env.local 을 확인하고 개발 서버를 껐다 켜주세요."
    );
  }

  return createClient(url, serviceRoleKey, {
    // 서버는 로그인 상태를 기억할 필요가 없다. 요청 하나 처리하고 끝이다.
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
