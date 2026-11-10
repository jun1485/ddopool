import * as ExpoCrypto from "expo-crypto";

// 네이티브 crypto 전역 보강
if (typeof globalThis.crypto === "undefined")
  Object.defineProperty(globalThis, "crypto", {
    value: {
      randomUUID: ExpoCrypto.randomUUID,
      getRandomValues: ExpoCrypto.getRandomValues,
    },
  });

// 네이티브 Response.json 정적 메서드 보강
if (typeof Response.json !== "function")
  Response.json = (data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), {
      ...init,
      headers: { "content-type": "application/json" },
    });
