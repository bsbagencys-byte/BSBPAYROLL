import { esslAdapter } from "@/lib/biometric/adapters/essl";
import { genericAdapter } from "@/lib/biometric/adapters/generic";
import type { AdapterContext, BiometricAdapter } from "@/lib/biometric/adapters/types";
import type { AdapterResult } from "@/types";
import type { BiometricVendor } from "@/lib/constants";

const ADAPTERS: BiometricAdapter[] = [esslAdapter, genericAdapter];

export function adapterFor(vendor: BiometricVendor | string | null | undefined): BiometricAdapter {
  return ADAPTERS.find((item) => item.vendor === vendor) ?? genericAdapter;
}

export function parseWithVendor(
  vendor: BiometricVendor | string | null | undefined,
  payload: unknown,
  context: AdapterContext
): AdapterResult {
  const preferred = adapterFor(vendor);
  if (preferred.canParse(payload, context) || vendor === preferred.vendor) {
    const result = preferred.parse(payload, context);
    if (result.ok || vendor) return result;
  }
  for (const adapter of ADAPTERS) {
    if (adapter.vendor === preferred.vendor) continue;
    if (!adapter.canParse(payload, context)) continue;
    return adapter.parse(payload, context);
  }
  return preferred.parse(payload, context);
}

export { esslAdapter, genericAdapter };
