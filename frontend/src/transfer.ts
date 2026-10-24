import type { TransferInput } from "./types";
export function formatMoney(value: string): string {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  return `${negative ? "−" : ""}₺${BigInt(whole || "0").toLocaleString("tr-TR")},${fraction.padEnd(2, "0").slice(0, 2)}`;
}
export function validateTransfer(
  input: TransferInput,
  sourceNumber?: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.sourceAccountId)
    errors.sourceAccountId = "Bir kaynak hesap seçin.";
  if (!input.targetAccountNumber.trim())
    errors.targetAccountNumber = "Alıcı hesap numarasını girin.";
  else if (input.targetAccountNumber.trim() === sourceNumber)
    errors.targetAccountNumber =
      "Alıcı hesap kaynak hesaptan farklı olmalıdır.";
  if (
    !/^\d{1,15}(?:[.,]\d{1,2})?$/.test(input.amount) ||
    !/[1-9]/.test(input.amount)
  )
    errors.amount = "Sıfırdan büyük, en fazla iki ondalıklı bir tutar girin.";
  return errors;
}
export function normalizedInput(input: TransferInput): TransferInput {
  return {
    ...input,
    targetAccountNumber: input.targetAccountNumber.trim(),
    amount: input.amount.replace(",", "."),
    description: input.description.trim(),
  };
}
export class TransferAttempt {
  private signature = "";
  private key = "";
  getKey(body: TransferInput) {
    const next = JSON.stringify(normalizedInput(body));
    if (this.signature !== next) {
      this.signature = next;
      this.key = crypto.randomUUID();
    }
    return this.key;
  }
  clear() {
    this.signature = "";
    this.key = "";
  }
}
