import { lookupName } from "@/lib/utils";
import { loadOrgCatalog } from "@/lib/org-data";
import { effectiveDeviceStatus, listDevices, listMappings, listNormalizedEvents, listPunches, listRawEvents } from "@/lib/biometric/repository";
import type {
  BiometricDeviceListItem,
  BiometricLogListItem,
  IdentityMapListItem,
  PunchListItem,
  UnmappedEventListItem,
} from "@/types";

export async function loadDeviceList(organizationId: string): Promise<BiometricDeviceListItem[]> {
  const [devices, catalog] = await Promise.all([listDevices(organizationId), loadOrgCatalog(organizationId)]);
  return devices.map((device) => ({
    id: device.id,
    name: device.name,
    vendor: device.vendor,
    serialNumber: device.serial_number,
    model: device.model,
    connectionMode: device.connection_mode,
    branchName: lookupName(catalog.branches, device.branch_id),
    locationName: lookupName(catalog.locations, device.location_id),
    timezone: device.timezone,
    status: effectiveDeviceStatus(device),
    lastSeenAt: device.last_seen_at,
    lastError: device.last_error,
    tokenHint: device.token_hint,
  }));
}

export async function loadMappingList(organizationId: string): Promise<IdentityMapListItem[]> {
  const [maps, devices, catalog] = await Promise.all([
    listMappings(organizationId),
    listDevices(organizationId),
    loadOrgCatalog(organizationId),
  ]);
  return maps.map((item) => {
    const device = devices.find((row) => row.id === item.device_id);
    const employee = catalog.employees.find((row) => row.id === item.employee_id);
    return {
      id: item.id,
      deviceId: item.device_id,
      deviceName: device?.name ?? "Unknown device",
      vendor: device?.vendor ?? "GENERIC",
      deviceUserId: item.device_user_id,
      employeeId: item.employee_id,
      employeeCode: employee?.employee_code ?? "—",
      employeeName: employee?.display_name ?? "Unknown employee",
      status: item.status,
      updatedAt: item.updated_at,
    };
  });
}

export async function loadPunchList(organizationId: string, limit = 100): Promise<PunchListItem[]> {
  const [punches, devices, catalog] = await Promise.all([
    listPunches(organizationId, limit),
    listDevices(organizationId),
    loadOrgCatalog(organizationId),
  ]);
  return punches.map((item) => {
    const device = devices.find((row) => row.id === item.device_id);
    const employee = catalog.employees.find((row) => row.id === item.employee_id);
    return {
      id: item.id,
      employeeId: item.employee_id,
      employeeCode: employee?.employee_code ?? "—",
      employeeName: employee?.display_name ?? "Unknown employee",
      deviceId: item.device_id,
      deviceName: device?.name ?? "Unknown device",
      punchedAt: item.punched_at,
      punchedAtLocal: item.punched_at_local,
      timezone: item.timezone,
      direction: item.direction,
      verificationMode: item.verification_mode,
      source: item.source,
    };
  });
}

export async function loadUnmappedList(organizationId: string): Promise<UnmappedEventListItem[]> {
  const [events, devices] = await Promise.all([listNormalizedEvents(organizationId, 300), listDevices(organizationId)]);
  return events
    .filter((item) => item.status === "UNMAPPED")
    .map((item) => ({
      id: item.id,
      deviceId: item.device_id,
      deviceName: devices.find((row) => row.id === item.device_id)?.name ?? "Unknown device",
      vendor: item.vendor,
      deviceUserId: item.device_user_id,
      punchedAt: item.punched_at,
      direction: item.direction,
      status: item.status,
    }));
}

export async function loadLogList(organizationId: string): Promise<BiometricLogListItem[]> {
  const [events, devices] = await Promise.all([listRawEvents(organizationId, 150), listDevices(organizationId)]);
  return events.map((item) => ({
    id: item.id,
    receivedAt: item.received_at,
    vendor: item.vendor,
    source: item.source,
    status: item.status,
    deviceName: devices.find((row) => row.id === item.device_id)?.name ?? null,
    errorMessage: item.error_message,
  }));
}

export async function loadBiometricOverview(organizationId: string) {
  const [devices, punches, unmapped, logs] = await Promise.all([
    loadDeviceList(organizationId),
    loadPunchList(organizationId, 8),
    loadUnmappedList(organizationId),
    loadLogList(organizationId),
  ]);
  return {
    devices,
    recentPunches: punches,
    unmappedCount: unmapped.length,
    rejectedCount: logs.filter((item) => item.status === "REJECTED").length,
    duplicateCount: logs.filter((item) => item.status === "DUPLICATE").length,
    onlineCount: devices.filter((item) => item.status === "ACTIVE").length,
  };
}
