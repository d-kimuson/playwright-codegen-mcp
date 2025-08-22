export interface ProtocolRequest {
  id: number;
  guid: string;
  method: string;
  params: unknown;
  metadata: Record<string, unknown>;
}

export interface ProtocolResponse {
  id?: number;
  method?: string;
  error?: { message: string; data: unknown };
  params?: Record<string, unknown>;
  result?: unknown;
}
