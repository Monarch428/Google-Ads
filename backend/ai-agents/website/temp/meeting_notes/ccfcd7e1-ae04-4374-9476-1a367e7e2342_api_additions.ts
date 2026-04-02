// ─────────────────────────────────────────────────────────────
// ADD THESE to the bottom of your existing lib/api.ts
// ─────────────────────────────────────────────────────────────

// ---------- Website File Types ----------
export interface WebsiteFile {
  id: string;
  name: string;
  type: string;
  project: string;
  uploadDate: string;
  size: string;
  status: "Processed" | "Processing";
}

export interface UploadResponse {
  uploaded: WebsiteFile[];
  count: number;
}

// ---------- Website File API ----------

/** Fetch all uploaded files */
export function fetchWebsiteFiles(token?: string) {
  return apiFetch<{ files: WebsiteFile[] }>(
    "/website/files/",
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
}

/** Upload one or more files */
export async function uploadWebsiteFiles(
  files: FileList | File[],
  token?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  Array.from(files).forEach((f) => formData.append("files", f));

  const res = await fetch(`${API_BASE_URL}/website/files/upload`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || res.statusText || "Upload failed");
  }
  return res.json();
}

/** Delete a file by ID */
export function deleteWebsiteFile(fileId: string, token?: string) {
  return apiFetch<{ message: string }>(`/website/files/${fileId}`, {
    method: "DELETE",
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}

/** Get download URL for a file */
export function getWebsiteFileDownloadUrl(fileId: string): string {
  return `${API_BASE_URL}/website/files/download/${fileId}`;
}

/** Update the project name for a file */
export function updateWebsiteFileProject(
  fileId: string,
  project: string,
  token?: string
) {
  return apiFetch<WebsiteFile>(`/website/files/${fileId}/project`, {
    method: "PATCH",
    body: JSON.stringify({ project }),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  });
}
