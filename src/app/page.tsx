import { redirect } from "next/navigation";

export default function Home() {
  // 주소창에 http://localhost:3000 만 쳐도 가장 자주 쓰는 화면으로 바로 보낸다
  redirect("/movements/new");
}
