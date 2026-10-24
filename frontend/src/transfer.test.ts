import { describe, it, expect } from "vitest";
import {
  TransferAttempt,
  validateTransfer,
  normalizedInput,
  formatMoney,
} from "./transfer";
const input = {
  sourceAccountId: 1,
  targetAccountNumber: "BF-0002-TRY",
  amount: "10000,25",
  description: " Kira ",
};
it("büyük bakiyelerde kuruş hassasiyetini korur", () => {
  expect(formatMoney("99999999999999999.99")).toBe(
    "₺99.999.999.999.999.999,99",
  );
  expect(formatMoney("123.4")).toBe("₺123,40");
});
describe("Transfer hazırlığı", () => {
  it("pozitif tutarı ve iki ondalık sınırını uygular", () => {
    for (const amount of ["0", "0.00", "-1", "1.001", "1e3", "NaN", ""])
      expect(validateTransfer({ ...input, amount }).amount).toBeTruthy();
    expect(validateTransfer(input)).toEqual({});
  });
  it("aynı hesaba transferi ve eksik alıcıyı engeller", () => {
    expect(
      validateTransfer(input, "BF-0002-TRY").targetAccountNumber,
    ).toBeTruthy();
    expect(
      validateTransfer({ ...input, targetAccountNumber: " " })
        .targetAccountNumber,
    ).toBeTruthy();
  });
  it("para metnini hassasiyet kaybetmeden dönüştürür", () => {
    expect(normalizedInput(input)).toEqual({
      ...input,
      amount: "10000.25",
      description: "Kira",
    });
  });
  it("bağlantı sonrası tekrar aynı anahtarı, değişen talep yeni anahtarı kullanır", () => {
    const attempt = new TransferAttempt();
    const key = attempt.getKey(input);
    expect(attempt.getKey({ ...input })).toBe(key);
    expect(attempt.getKey({ ...input, amount: "10001" })).not.toBe(key);
    attempt.clear();
    expect(attempt.getKey(input)).not.toBe(key);
  });
});
