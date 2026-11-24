import assert from "node:assert/strict";
import { test } from "node:test";

import { fixParticles } from "./korean-particles.mjs";

test("한글 단어 받침에 맞춰 은·는 선택", () => {
  assert.equal(fixParticles("데이터은(는) 사실이다"), "데이터는 사실이다");
  assert.equal(fixParticles("산업재해은(는) 사건이다"), "산업재해는 사건이다");
  assert.equal(fixParticles("지식은(는) 정보다"), "지식은 정보다");
});

test("영문 약어·숫자 읽기에 맞춰 은·는 선택", () => {
  assert.equal(fixParticles("DBMS은(는)"), "DBMS는");
  assert.equal(fixParticles("CRM은(는)"), "CRM은");
  assert.equal(fixParticles("IPv6은(는)"), "IPv6은");
  assert.equal(fixParticles("IPv4은(는)"), "IPv4는");
  assert.equal(fixParticles("오류 값 #DIV/0!은(는)"), "오류 값 #DIV/0!은");
});

test("단어로 읽는 영문 용어는 읽기 기준으로 선택", () => {
  assert.equal(fixParticles("VLOOKUP은(는)"), "VLOOKUP은");
  assert.equal(fixParticles("UPPER은(는)"), "UPPER는");
  assert.equal(fixParticles("ROW_NUMBER은(는)"), "ROW_NUMBER는");
  assert.equal(fixParticles("/home은(는)"), "/home은");
});

test("조사 표기가 없는 문장은 그대로 유지", () => {
  assert.equal(fixParticles("정답은 3번이다"), "정답은 3번이다");
});
