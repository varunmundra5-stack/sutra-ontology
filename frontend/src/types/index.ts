export type Role = "admin" | "editor" | "viewer";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ClassInfo {
  uri: string;
  local_name: string;
  label: string | null;
  comment: string | null;
}

export interface PropertyInfo {
  uri: string;
  local_name: string;
  type: "object" | "datatype";
  domain: string | null;
  range: string | null;
  label: string | null;
}

export interface CountByClass {
  class_uri: string;
  class_name: string;
  n: number;
}

export interface Instance {
  uri: string;
  local_name: string;
  [prop: string]: unknown;
}

export interface InstancesResponse {
  class_uri: string;
  count: number;
  instances: Instance[];
}

export interface AtcLossRow {
  feeder_uri: string;
  feeder_name: string;
  billed_kwh: number;
  distributed_kwh: number;
  loss_pct: number;
}

export interface FeederLoadRow {
  feeder_uri: string;
  feeder_name: string;
  total_kwh: number;
  readings: number;
}
