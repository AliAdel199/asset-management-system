import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MaintenanceRequestDetailsView } from "./maintenance-request-details";

vi.mock("./api-client", () => ({
  apiFetch: vi.fn(),
  resolveApiFileUrl: (url: string) => url,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const mockHasPermission = vi.fn();
vi.mock("./auth-context", () => ({
  useAuth: () => ({ hasPermission: mockHasPermission }),
}));

import { apiFetch } from "./api-client";

const pendingRequest = {
  id: "req-1",
  requestNumber: "MTN-2026-ABC123",
  description: "عطل بالشاشة",
  status: "PENDING",
  cost: null,
  resultNotes: null,
  performedAt: null,
  asset: {
    id: "asset-1",
    internalNumber: "A-1",
    model: null,
    assetCategory: { name: "أجهزة", code: "DEV" },
    owningOrganizationUnit: { name: "وحدة 1", code: "U1" },
    status: { id: "status-1", name: "صالح ويعمل", code: "WORKING" },
  },
  maintenanceType: { name: "طارئة" },
  materials: [],
  attachments: [],
  requestedByUser: { id: "user-1", fullName: "أحمد" },
  decidedByUser: null,
  decisionNotes: null,
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

function mockLoad(request: unknown) {
  vi.mocked(apiFetch).mockImplementation(async (path: string) => {
    if (path === "/maintenance-requests/req-1") return jsonResponse(request);
    if (path === "/reference-data") return jsonResponse({ assetStatuses: [] });
    if (path.endsWith("/approve") || path.endsWith("/reject")) {
      return jsonResponse({ id: "req-1", status: "OPEN" });
    }
    throw new Error(`unexpected path ${path}`);
  });
}

describe("MaintenanceRequestDetailsView approval section", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("shows approve/reject buttons for a pending request when the user can approve", async () => {
    mockHasPermission.mockReturnValue(true);
    mockLoad(pendingRequest);

    render(<MaintenanceRequestDetailsView requestId="req-1" />);

    await waitFor(() => {
      expect(screen.getByText("MTN-2026-ABC123")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "اعتماد الطلب" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "رفض الطلب" }),
    ).toBeInTheDocument();
  });

  it("shows a read-only notice instead of approve/reject when the user lacks the permission", async () => {
    mockHasPermission.mockReturnValue(false);
    mockLoad(pendingRequest);

    render(<MaintenanceRequestDetailsView requestId="req-1" />);

    await waitFor(() => {
      expect(screen.getByText("MTN-2026-ABC123")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: "اعتماد الطلب" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/بانتظار موافقة مسؤول مخوّل/)).toBeInTheDocument();
  });

  it("sends the typed rejection reason when rejecting", async () => {
    mockHasPermission.mockReturnValue(true);
    mockLoad(pendingRequest);
    const user = userEvent.setup();

    render(<MaintenanceRequestDetailsView requestId="req-1" />);

    await waitFor(() => {
      expect(screen.getByText("MTN-2026-ABC123")).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("اكتب سبب الرفض إن وجد"),
      "غير ضروري",
    );
    await user.click(screen.getByRole("button", { name: "رفض الطلب" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/maintenance-requests/req-1/reject",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ notes: "غير ضروري" }),
        }),
      );
    });
  });

  it("does not show the approval section once the request has been decided", async () => {
    mockHasPermission.mockReturnValue(true);
    mockLoad({ ...pendingRequest, status: "OPEN" });

    render(<MaintenanceRequestDetailsView requestId="req-1" />);

    await waitFor(() => {
      expect(screen.getByText("MTN-2026-ABC123")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: "اعتماد الطلب" }),
    ).not.toBeInTheDocument();
  });
});
