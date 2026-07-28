import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// 직원 계정을 만들어주는 창구.
// 브라우저는 여기에 "이 사람 계정 만들어주세요"라고 요청만 보내고,
// 마스터키는 이 파일 안(서버)에서만 쓰인다.
export async function POST(request: Request) {
  const admin = createAdminClient();

  // ① 진짜 로그인한 사람이 보낸 요청인가?
  // 브라우저가 보내온 출입증을 Supabase 에 가져가 진짜인지 대조한다.
  // (출입증은 위조할 수 없게 서명되어 있어서, 남의 것을 지어낼 수 없다)
  const token = (request.headers.get("Authorization") ?? "")
    .replace("Bearer ", "")
    .trim();

  if (token === "") {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: caller, error: callerError } = await admin.auth.getUser(token);

  if (callerError || !caller.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // ② 그 사람이 원장인가?
  // 본인이 고칠 수 없는 칸(app_metadata)에서 확인한다.
  // 이름이 들어 있는 user_metadata 는 본인이 고칠 수 있어서 여기에 쓰면 안 된다.
  if (caller.user.app_metadata?.role !== "owner") {
    return NextResponse.json(
      { error: "직원 계정을 만들 권한이 없습니다." },
      { status: 403 }
    );
  }

  // ③ 보내온 값이 멀쩡한가?
  const body = await request.json().catch(() => null);

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (email === "" || name === "") {
    return NextResponse.json(
      { error: "이메일과 이름을 모두 입력해주세요." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "임시 비밀번호는 6자 이상이어야 합니다." },
      { status: 400 }
    );
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    // 메일 인증 절차를 건너뛴다. 원장님이 직접 만들어주는 계정이라 확인이 이미 끝났다.
    email_confirm: true,
    // 이름은 본인이 나중에 고칠 수 있는 칸에 넣는다 (기록자 이름으로 쓰인다)
    user_metadata: { name },
    // 역할은 본인이 못 고치는 칸에 넣는다
    app_metadata: { role: "staff" },
  });

  if (createError) {
    const alreadyExists =
      createError.message.includes("already") ||
      createError.message.includes("registered");

    return NextResponse.json(
      {
        error: alreadyExists
          ? "이미 등록된 이메일입니다."
          : "계정을 만들지 못했습니다. 이메일 주소를 확인해주세요.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
