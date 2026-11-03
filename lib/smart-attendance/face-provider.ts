import type { FaceProviderKind, VerificationOutcome } from "@/lib/constants";

export interface FaceVerificationInput {
  eventId: string;
  evidenceRef?: string;
}

export interface FaceVerificationResult {
  outcome: VerificationOutcome;
  notes: string;
}

export interface FaceVerificationProvider {
  kind: FaceProviderKind;
  verify(input: FaceVerificationInput): Promise<FaceVerificationResult>;
}

export class UnconfiguredFaceProvider implements FaceVerificationProvider {
  kind = "NONE" as const;
  async verify(): Promise<FaceVerificationResult> {
    return {
      outcome: "UNAVAILABLE",
      notes: "No face-verification provider is configured. Facial matching is not claimed.",
    };
  }
}

export function getFaceProvider(kind: FaceProviderKind, configured: boolean): FaceVerificationProvider {
  if (kind === "EXTERNAL" && configured) {
    return new UnconfiguredFaceProvider();
  }
  return new UnconfiguredFaceProvider();
}
