// 운영 스크립트용 Postgres 쿼리 빌더
const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
const OPERATORS = { eq: "=", lt: "<", lte: "<=", gt: ">", gte: ">=" };

// 식별자 검증 후 따옴표 처리
function quote(name) {
  if (!IDENTIFIER.test(name)) throw new Error(`허용되지 않은 식별자 ${name}`);
  return `"${name}"`;
}

// 표 단위 조회·수정·삭제 구문 조립
function tableQuery(pool, table) {
  const state = {
    action: "select",
    columns: "*",
    values: null,
    filters: [],
    order: null,
    limit: null,
    single: false,
  };
  const builder = {
    select(columns = "*") {
      state.columns =
        columns === "*"
          ? "*"
          : columns
              .split(",")
              .map((c) => quote(c.trim()))
              .join(",");
      return builder;
    },
    update(values) {
      state.action = "update";
      state.values = values;
      return builder;
    },
    delete() {
      state.action = "delete";
      return builder;
    },
    order(column) {
      state.order = quote(column);
      return builder;
    },
    limit(count) {
      state.limit = Number(count);
      return builder;
    },
    single() {
      state.single = true;
      return builder;
    },
    then(resolve, reject) {
      return run().then(resolve, reject);
    },
  };
  for (const [method, operator] of Object.entries(OPERATORS))
    builder[method] = (column, value) => {
      state.filters.push([quote(column), operator, value]);
      return builder;
    };

  // 조립 구문 실행 결과를 data·error 형태로 반환
  async function run() {
    const params = [];
    const where = state.filters.length
      ? ` where ${state.filters.map(([c, op, v]) => `${c} ${op} $${params.push(v)}`).join(" and ")}`
      : "";
    let sql;
    if (state.action === "update") {
      const sets = Object.entries(state.values).map(
        ([c, v]) => `${quote(c)} = $${params.push(v)}`,
      );
      sql = `update public.${quote(table)} set ${sets.join(", ")}${where}`;
    } else if (state.action === "delete")
      sql = `delete from public.${quote(table)}${where}`;
    else
      sql = `select ${state.columns} from public.${quote(table)}${where}${state.order ? ` order by ${state.order}` : ""}${state.limit != null ? ` limit ${state.limit}` : ""}`;
    try {
      const { rows } = await pool.query(sql, params);
      if (state.single && rows.length !== 1)
        return { data: null, error: new Error("단일 행 조회 실패") };
      return { data: state.single ? rows[0] : rows, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
  return builder;
}

// Supabase 클라이언트 호출 모양의 pg 래퍼 생성
export function createPgQueryClient(pool) {
  return {
    from: (table) => tableQuery(pool, table),
    async rpc(name, args = {}) {
      const params = [];
      const list = Object.entries(args).map(
        ([k, v]) => `${quote(k)} => $${params.push(v)}`,
      );
      try {
        const { rows } = await pool.query(
          `select * from public.${quote(name)}(${list.join(", ")})`,
          params,
        );
        return { data: rows, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
  };
}
