// 테스트용 expo-sqlite 비동기 API 대체 구현
const { DatabaseSync } = require("node:sqlite");

const databases = new Map();

// 결합 매개변수 배열 정규화
function toParams(params) {
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
}

// 쿼리 결과 행 순수 객체 변환
function toPlainRows(rows) {
  return rows.map((row) => ({ ...row }));
}

// 데이터베이스 연결 래퍼 생성
function createConnection(database) {
  const connection = {
    async execAsync(source) {
      database.exec(source);
    },
    async runAsync(source, ...params) {
      const result = database.prepare(source).run(...toParams(params));
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
    async getAllAsync(source, ...params) {
      return toPlainRows(database.prepare(source).all(...toParams(params)));
    },
    async getFirstAsync(source, ...params) {
      const row = database.prepare(source).get(...toParams(params));
      return row == null ? null : { ...row };
    },
    async withExclusiveTransactionAsync(task) {
      database.exec("BEGIN IMMEDIATE");
      try {
        await task(connection);
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return connection;
}

// 이름별 메모리 데이터베이스 열기
async function openDatabaseAsync(name) {
  if (!databases.has(name))
    databases.set(name, createConnection(new DatabaseSync(":memory:")));
  return databases.get(name);
}

// 테스트 간 데이터베이스 초기화
function __resetDatabases() {
  databases.clear();
}

module.exports = { openDatabaseAsync, __resetDatabases };
