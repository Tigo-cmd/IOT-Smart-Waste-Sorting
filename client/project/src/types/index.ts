export type WasteClass = 'plastic' | 'metal' | 'organic' | 'paper' | 'nylon' | 'unknown';
export type DeviceStatus = 'online' | 'offline' | 'error' | 'maintenance';
export type AlertType = 'device_offline' | 'low_confidence' | 'backend_error' | 'maintenance' | 'info';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Device {
  id: string;
  name: string;
  location: string;
  status: DeviceStatus;
  last_seen: string | null;
  firmware_version: string;
  ip_address: string;
  created_at: string;
}

export interface Detection {
  id: string;
  device_id: string | null;
  waste_class: WasteClass;
  confidence: number;
  image_url: string;
  timestamp: string;
  notes: string;
  devices?: Pick<Device, 'name' | 'location'> | null;
}

export interface Alert {
  id: string;
  device_id: string | null;
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  resolved: boolean;
  created_at: string;
  resolved_at: string | null;
  devices?: Pick<Device, 'name'> | null;
}

export interface CategoryStats {
  plastic: number;
  metal: number;
  organic: number;
  paper: number;
  nylon: number;
  unknown: number;
}

export interface DailyCount {
  date: string;
  label: string;
  count: number;
}

export type FilterState = {
  device: string;
  category: WasteClass | 'all';
  dateFrom: string;
  dateTo: string;
};
