// 번들 소스맵에 Sentry 디버그 ID 삽입
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

module.exports = getSentryExpoConfig(__dirname);
