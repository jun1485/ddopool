// 채널별 서버 주소를 넣어 OTA 업데이트 발행 (사용: npm run ota -- <채널> "<메시지>")
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const [channel, message] = process.argv.slice(2);
const profile = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8')).build[channel];
if (!profile?.env || !message) {
  console.error('사용법: npm run ota -- <preview|production> "<업데이트 설명>"');
  process.exit(1);
}

// 명령 실행 결과 글자 (실패하면 null)
const output = (args) => {
  const run = spawnSync('npx', args, { encoding: 'utf8', shell: true, env: { ...process.env, ...profile.env } });
  return run.status === 0 ? run.stdout : null;
};

// 이 채널 마지막 빌드와 지금 코드의 런타임이 다르면 설치된 앱에 업데이트가 안 가므로 발행 전에 멈춤
// 로컬 네이티브 빌드가 node_modules 를 고쳐 런타임이 바뀐 적이 있음, 알고도 보내려면 ALLOW_RUNTIME_MISMATCH=1
function checkRuntime() {
  const builds = output(['eas-cli@latest', 'build:list', '--channel', channel, '--status', 'finished', '--limit', '10', '--json', '--non-interactive']);
  if (!builds) {
    console.error('빌드 목록을 불러오지 못해 런타임을 확인하지 못했어요.');
    return false;
  }
  const latest = new Map();
  for (const build of JSON.parse(builds)) {
    const platform = build.platform.toLowerCase();
    if (!latest.has(platform) && build.runtime?.version) latest.set(platform, build.runtime.version);
  }
  let ok = true;
  for (const [platform, built] of latest) {
    const resolved = output(['expo-updates', 'runtimeversion:resolve', '--platform', platform]);
    const local = resolved ? JSON.parse(resolved.slice(resolved.indexOf('{'))).runtimeVersion : null;
    console.log(`${platform} 런타임: 빌드 ${built} / 지금 ${local ?? '확인 실패'}`);
    if (local !== built) {
      ok = false;
      console.error(`${platform} 런타임이 마지막 빌드와 달라요. npx eas-cli fingerprint:compare ${built} --environment ${channel} 로 다른 파일을 확인해 주세요.`);
    }
  }
  return ok;
}

if (!checkRuntime() && process.env.ALLOW_RUNTIME_MISMATCH !== '1') process.exit(1);

// .env.local 의 로컬 서버 주소보다 채널 빌드 설정 값이 우선하도록 실행 환경에 넣음
// 셸 실행이라 띄어쓰기가 든 설명은 따옴표로 감쌈
const quoted = `"${message.replaceAll('"', "'")}"`;
const result = spawnSync('npx', ['eas-cli@latest', 'update', '--channel', channel, '--environment', channel, '--message', quoted, '--non-interactive'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...profile.env },
});
process.exit(result.status ?? 1);
