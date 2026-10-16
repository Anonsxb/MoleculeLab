/** Shared API client for the MoleculeLab backend. */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface Descriptors {
  molecular_weight: number | null;
  logp: number | null;
  hbd: number | null;
  hba: number | null;
  tpsa: number | null;
}

export interface DescriptorProvenance {
  rdkit_version?: string;
  calculated_at?: string;
  calculation_failed?: boolean;
  methods?: Record<string, string>;
}

export interface Molecule {
  id: number;
  display_name: string;
  formula?: string | null;
  original_smiles: string;
  canonical_smiles?: string | null;
  external_id?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  molecular_weight?: number | null;
  logp?: number | null;
  hbd?: number | null;
  hba?: number | null;
  tpsa?: number | null;
  validation_status?: string | null;
  dataset_id?: number | null;
}

export interface MoleculePage {
  items: Molecule[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
  dataset_id?: number | null;
  query?: string | null;
}

export interface MoleculeDetail extends Molecule {
  structure_svg?: string | null;
  descriptors?: Record<string, { value: number | null; unit: string; method: string }>;
  descriptor_provenance?: DescriptorProvenance;
}

export interface Dataset {
  id: number;
  name: string;
  description: string;
  source_name: string;
  source_url?: string | null;
  version_label: string;
  created_at: string;
  record_count: number;
  valid_count: number;
  invalid_count: number;
}

export interface DistributionPoint {
  start: number;
  end: number;
  count: number;
}

export interface Distribution {
  descriptor: string;
  label: string;
  unit: string;
  dataset_name: string;
  dataset_id?: number | null;
  record_count: number;
  included_count: number;
  missing_count: number;
  bins: DistributionPoint[];
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
}

export interface DescriptorSummary {
  key: string;
  label: string;
  unit: string;
  record_count: number;
  included_count: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
}

export interface ScatterPoint {
  id: number;
  name: string;
  x: number;
  y: number;
}

export interface DatasetSummary {
  dataset_name: string;
  dataset_id?: number | null;
  record_count: number;
  descriptors: DescriptorSummary[];
}

export interface Scatter {
  dataset_name: string;
  x_label: string;
  y_label: string;
  x_unit: string;
  y_unit: string;
  record_count: number;
  included_count: number;
  points: ScatterPoint[];
}

export interface QualityReport {
  total_rows_read: number;
  accepted_rows: number;
  rejected_rows: number;
  invalid_structures: number;
  missing_required_fields: number;
  duplicate_records: number;
  calculation_failures: number;
}

export interface RejectedRow {
  row_number: number;
  reason: string;
  detail: string;
  raw: Record<string, string>;
}

export interface DuplicateRow {
  row_number: number;
  reason: string;
  detail: string;
  raw: Record<string, string>;
}

export interface ImportedRecord {
  name: string;
  smiles: string;
  external_id?: string | null;
  source?: string | null;
  notes?: string | null;
  formula?: string | null;
  canonical_smiles?: string | null;
  molecular_weight?: number | null;
  logp?: number | null;
  hbd?: number | null;
  hba?: number | null;
  tpsa?: number | null;
}

export interface ImportPreview {
  filename: string;
  dataset_name: string;
  description: string;
  quality: QualityReport;
  accepted: ImportedRecord[];
  rejected: RejectedRow[];
  duplicates: DuplicateRow[];
  truncated_rows: number;
}

export interface CompareResult {
  molecules: MoleculeDetail[];
  descriptors: Array<{
    key: string;
    label: string;
    unit: string;
    values: Array<number | null>;
    differences: Array<number | null>;
  }>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ApiFailure extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const error = (payload as { error?: ApiError } | null)?.error;
    throw new ApiFailure(
      response.status,
      error?.code || "HTTP_ERROR",
      error?.message || `The backend responded with HTTP ${response.status}.`,
    );
  }
  return payload as T;
}

/** Thrown when the backend cannot be reached at all (network failure). */
export class ApiUnreachableError extends Error {
  constructor() {
    super("The MoleculeLab API is not reachable. Make sure the backend server is running on port 8000.");
    this.name = "ApiUnreachableError";
  }
}

export function describeError(error: unknown, fallback: string): string {
  /** Turn any API failure into a user-facing explanation. */
  if (error instanceof ApiFailure) return error.message;
  if (error instanceof TypeError) {
    return new ApiUnreachableError().message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });
  } catch {
    throw new ApiUnreachableError();
  }
  return handleResponse<T>(response);
}

export const api = {
  health: () => request<{ status: string; app_name: string; version: string; rdkit_version: string }>(
    "/health",
  ),
  datasets: () =>
    request<{
      items: Dataset[];
      total: number;
      total_unique_molecules: number;
      total_entries: number;
      total_valid_entries: number;
      total_invalid_entries: number;
    }>("/datasets"),
  recentImport: () =>
    request<{
      job: {
        id: number;
        filename: string;
        status: string;
        dataset_id: number | null;
        rows_read: number;
        rows_accepted: number;
        rows_rejected: number;
        duplicates: number;
        created_at: string;
      } | null;
    }>("/imports/recent"),
  dataset: (id: number) => request<Dataset>(`/datasets/${id}`),

  molecules: (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") search.set(key, String(value));
    }
    return request<MoleculePage>(`/molecules?${search.toString()}`);
  },
  molecule: (id: number) => request<MoleculeDetail>(`/molecules/${id}`),
  validate: (smiles: string) =>
    request<{
      valid: boolean;
      status: string;
      original_smiles: string;
      canonical_smiles?: string | null;
      formula?: string | null;
      descriptors?: Record<string, number | null>;
      structure_svg?: string | null;
      rdkit_version?: string;
      error_message?: string | null;
    }>("/molecules/validate", { method: "POST", body: JSON.stringify({ smiles }) }),

  distribution: (descriptor: string, datasetId?: number | null) =>
    request<Distribution>(
      `/analytics/distribution?descriptor=${encodeURIComponent(descriptor)}${datasetId ? `&dataset_id=${datasetId}` : ""}`,
    ),
  summary: (datasetId?: number | null) =>
    request<DatasetSummary>(
      `/analytics/summary${datasetId ? `?dataset_id=${datasetId}` : ""}`,
    ),
  scatter: (x: string, y: string, datasetId?: number | null) =>
    request<Scatter>(
      `/analytics/scatter?x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}${datasetId ? `&dataset_id=${datasetId}` : ""}`,
    ),

  compare: (moleculeIds: number[]) =>
    request<CompareResult>("/compare", {
      method: "POST",
      body: JSON.stringify({ molecule_ids: moleculeIds }),
    }),

  exportCsv: (params: Record<string, string | number | undefined>) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") search.set(key, String(value));
    }
    return `${API_URL}/api/export.csv?${search.toString()}`;
  },
  exportMeta: () => request<{
    dataset_name: string;
    dataset_version: string;
    active_filters: Record<string, unknown>;
    selected_descriptors: string[];
    export_timestamp: string;
    app_version: string;
    rdkit_version: string;
    calculation_methodology: Record<string, string>;
    warnings: string[];
  }>("/export/meta"),

  previewImport: async (file: File, datasetName: string, description: string) => {
    const form = new FormData();
    form.append("file", file, file.name);
    let response: Response;
    try {
      response = await fetch(
        `${API_URL}/api/datasets/import/preview?dataset_name=${encodeURIComponent(datasetName)}&description=${encodeURIComponent(description)}`,
        { method: "POST", body: form },
      );
    } catch {
      throw new ApiUnreachableError();
    }
    return handleResponse<ImportPreview>(response);
  },
  confirmImport: (payload: unknown) =>
    request<{ dataset_id: number; dataset_name: string; created: number; linked: number }>(
      "/datasets/import",
      { method: "POST", body: JSON.stringify(payload) },
    ),
};

/** Format a descriptor value for display; missing values render as an em dash. */
export function formatValue(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined) return "—";
  const rounded = Number(value.toFixed(digits));
  return Number.isFinite(rounded) ? String(rounded) : "—";
}

export const DESCRIPTOR_META: Record<string, { label: string; unit: string; key: keyof Molecule }> = {
  molecular_weight: { label: "Molecular Weight", unit: "g/mol", key: "molecular_weight" },
  logp: { label: "LogP (Crippen est.)", unit: "dimensionless", key: "logp" },
  hbd: { label: "H-Bond Donors", unit: "count", key: "hbd" },
  hba: { label: "H-Bond Acceptors", unit: "count", key: "hba" },
  tpsa: { label: "TPSA", unit: "Å²", key: "tpsa" },
};
