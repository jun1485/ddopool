import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  create schema auth;
  create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated, service_role;
  grant select on auth.users to authenticated;
  alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
  alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
`);
try {
  for (const file of readdirSync("db/migrations")
    .filter((file) => file.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(`db/migrations/${file}`, "utf8"));
    console.log(`마이그레이션 검증 ${file}`);
  }
  const userA = "00000000-0000-4000-8000-000000000001";
  const userB = "00000000-0000-4000-8000-000000000002";
  await assert.rejects(
    db.query("insert into auth.users(id) values($1)", [userA]),
    /동의/,
  );
  for (const id of [userA, userB])
    await db.query(
      "insert into auth.users(id, raw_user_meta_data) values($1,$2)",
      [id, { age_over_14: true, legal_version: "test" }],
    );
  await db.exec(
    `insert into public.exams(id,title,short_title) values('test-exam','시험','시험');`,
  );
  await db.query(
    `insert into public.questions(id,exam_id,subject,prompt,choices,answer_index,explanation) values('test-question','test-exam','과목','문제',$1,0,'해설')`,
    [JSON.stringify(["가", "나"])],
  );
  await assert.rejects(
    db.exec(
      `update public.questions set status='published' where id='test-question'`,
    ),
    /출처/,
  );
  await db.exec(`insert into public.content_sources(name,license,source_type,rights_verified_at,rights_evidence) values('검증용 출처','자체 제작','manual',now(),'검증용 증빙');
    update public.questions set source_id=1 where id='test-question';`);
  await assert.rejects(
    db.exec(
      `update public.questions set status='published' where id='test-question'`,
    ),
    /검수/,
  );
  await db.exec(`insert into public.question_reviews(question_id,verdict) values('test-question','approved');
    update public.questions set status='published' where id='test-question';
    update public.questions set prompt='개정 문제' where id='test-question';`);
  assert.equal(
    (
      await db.query(
        `select status from public.questions where id='test-question'`,
      )
    ).rows[0].status,
    "needs_review",
  );
  await assert.rejects(
    db.exec(
      `update public.questions set status='published' where id='test-question'`,
    ),
    /검수/,
  );
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
    userA,
  ]);
  await db.exec("set role authenticated");
  await db.exec(`select public.save_learning_extras(0, '{}')`);
  await assert.rejects(
    db.exec(`select public.save_learning_extras(0, '{}')`),
    /다른 기기/,
  );
  await db.exec(`select public.save_learning_extras(1, '{}')`);
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
    userB,
  ]);
  assert.equal(
    (await db.query("select * from public.user_learning_extras")).rows.length,
    0,
  );
  await assert.rejects(
    db.exec("select public.purge_expired_personal_data()"),
    /permission denied/,
  );
  await db.exec("reset role");
  await db.query(
    `insert into public.exam_requests(normalized_name,display_name,requester_id,status) values('숨김시험','숨김시험',$1,'approved')`,
    [userA],
  );
  const requestId = (await db.query("select id from public.exam_requests"))
    .rows[0].id;
  await db.exec("set role authenticated");
  await db.query("select public.hide_exam_request($1,true)", [requestId]);
  assert.equal(
    (await db.query(`select * from public.search_exam_requests('숨김시험')`))
      .rows.length,
    0,
  );
  await db.exec("select public.reset_request_visibility()");
  assert.equal(
    (await db.query(`select * from public.search_exam_requests('숨김시험')`))
      .rows.length,
    1,
  );
  await db.exec("reset role");
  await db.query(
    "insert into public.push_tokens(token,user_id,platform) values('test-device',$1,'android')",
    [userA],
  );
  await db.query(
    "insert into public.notifications(user_id,type) values($1,'request_status_changed')",
    [userA],
  );
  assert.equal(
    (await db.query("select * from public.push_deliveries")).rows.length,
    1,
  );
  await db.query(
    "update public.push_tokens set user_id=$1 where token='test-device'",
    [userB],
  );
  assert.equal(
    (await db.query("select * from public.push_deliveries")).rows.length,
    0,
  );
  await db.exec(
    "insert into public.question_reviews(question_id,verdict) values('test-question','approved'); update public.questions set status='published' where id='test-question'; update public.content_sources set url='https://example.com/revised' where id=1;",
  );
  assert.equal(
    (
      await db.query(
        "select status from public.questions where id='test-question'",
      )
    ).rows[0].status,
    "needs_review",
  );
  await assert.rejects(
    db.exec(
      "update public.questions set status='published' where id='test-question'",
    ),
    /검수/,
  );
  console.log(
    "가입 동의·공개 게이트·버전 회귀·계정 RLS·충돌·운영 권한·숨김 검증 통과",
  );
  const offset = 12 - new Date().getUTCHours();
  const timezone =
    offset === 0
      ? "UTC"
      : `Etc/GMT${offset > 0 ? "-" : "+"}${Math.abs(offset)}`;
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    userA,
  ]);
  await db.exec("set role authenticated");
  await assert.rejects(
    db.query(
      "select public.save_study_reminder('test-device',true,12,$1,now()+interval '14 days',false)",
      [timezone],
    ),
    /소유/,
  );
  await assert.rejects(
    db.exec("select public.queue_study_reminders()"),
    /permission denied/,
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    userB,
  ]);
  await db.query(
    "select public.save_study_reminder('test-device',true,12,$1,now()+interval '14 days',false)",
    [timezone],
  );
  await db.exec(
    "reset role; select set_config('request.jwt.claims','{\"role\":\"service_role\"}',false)",
  );
  await db.exec("select public.queue_study_reminders()");
  assert.equal(
    (
      await db.query(
        "select * from public.push_deliveries where study_date is not null",
      )
    ).rows.length,
    0,
  );
  await db.exec(
    "update public.study_reminder_preferences set local_until=now()-interval '1 minute'; select public.queue_study_reminders(); select public.queue_study_reminders()",
  );
  assert.equal(
    (
      await db.query(
        "select * from public.push_deliveries where study_date is not null",
      )
    ).rows.length,
    1,
  );
  await db.exec(
    "update public.study_reminder_preferences set last_studied_date=(now() at time zone timezone)::date",
  );
  assert.equal(
    (
      await db.query(
        "select * from public.claim_push_deliveries() where study_date is not null",
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select state from public.push_deliveries where study_date is not null",
      )
    ).rows[0].state,
    "dead",
  );
  console.log(
    "학습 알림 소유권·운영 권한·로컬 중복 방지·발송 중복 방지·학습 후 취소 검증 통과",
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    userA,
  ]);
  await db.exec("set role authenticated");
  const webParams = [
    "https://web.push.apple.com/test",
    "A".repeat(87),
    "B".repeat(22),
    12,
    "UTC",
    false,
  ];
  const webSql = "select public.save_web_push($1,$2,$3,$4,$5,$6) as token";
  const webToken = (await db.query(webSql, webParams)).rows[0].token;
  await assert.rejects(
    db.query(webSql, ["https://127.0.0.1/private", ...webParams.slice(1)]),
    /형식/,
  );
  await assert.rejects(
    db.query("select * from public.web_push_subscriptions"),
    /permission/,
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    userB,
  ]);
  await assert.rejects(db.query(webSql, webParams), /연결 해제/);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    userA,
  ]);
  await db.query("select public.unregister_push_token($1)", [webToken]);
  await db.exec("reset role");
  assert.equal(
    (await db.query("select * from public.web_push_subscriptions")).rows.length,
    0,
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    userA,
  ]);
  await db.exec("set role authenticated");
  await assert.rejects(
    db.query("select public.save_reminder_policy('test-device',1,21,null)"),
    /소유/,
  );
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    userB,
  ]);
  await db.query("select public.save_reminder_policy('test-device',1,21,null)");
  await assert.rejects(
    db.query("select public.save_reminder_policy('test-device',3,21,null)"),
    /check/,
  );
  await db.exec("reset role");
  assert.equal(
    (
      await db.query(
        "select public.reminder_policy_allows('test-device',12,$1) allowed",
        [timezone],
      )
    ).rows[0].allowed,
    true,
  );
  assert.equal(
    (
      await db.query(
        "select public.reminder_policy_allows('test-device',21,$1) allowed",
        [timezone],
      )
    ).rows[0].allowed,
    false,
  );
  await db.query(
    "update public.reminder_policies set paused_date=(now() at time zone $1)::date where token='test-device'",
    [timezone],
  );
  assert.equal(
    (
      await db.query(
        "select public.reminder_policy_allows('test-device',12,$1) allowed",
        [timezone],
      )
    ).rows[0].allowed,
    false,
  );
  console.log("알림 정책 소유권·입력 제한·현지 시간·오늘 쉬기 검증 통과");
  console.log("웹 구독 소유권·주소 제한·조회 차단·해제 연쇄 정리 검증 통과");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
