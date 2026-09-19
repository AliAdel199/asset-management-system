import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MaintenanceWorkspace } from "./maintenance-workspace";

vi.mock("./api-client", () => ({
  apiFetch: vi.fn(),
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
  },
  maintenanceType: { id: "type-1", name: "طارئة" },
  requestedByUser: { id: "user-1", fullName: "أحمد" },
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

function mockInitialLoad(requests: unknown[]) {
  vi.mocked(apiFetch).mockImplementation(async (path: string) => {
    if (path === "/assets") return jsonResponse([]);
    if (path === "/reference-data") return jsonResponse({ maintenanceTypes: [] });
    if (path === "/maintenance-requests") return jsonResponse(requests);
    if (path.endsWith("/approve") || path.endsWith("/reject")) {
      return jsonResponse({ id: "req-1", status: "OPEN" });
    }
    throw new Error(`unexpected path ${path}`);
  });
}

describe("MaintenanceWorkspace (list mode)", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("shows approve/reject controls for a pending request when the user can approve", async () => {
    mockHasPermission.mockReturnValue(true);
    mockInitialLoad([pendingRequest]);

    render(<MaintenanceWorkspace mode="list" />);

    await waitFor(() => {
      expect(screen.getByText("MTN-2026-ABC123")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "اعتماد" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "رفض" })).toBeInTheDocument();
  });

  it("hides approve/reject controls when the user lacks MAINTENANCE_APPROVE", async () => {
    mockHasPermission.mockReturnValue(false);
    mockInitialLoad([pendingRequest]);

    render(<MaintenanceWorkspace mode="list" />);

    await waitFor(() => {
      expect(screen.getByText("MTN-2026-ABC123")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: "اعتماد" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "رفض" }),
    ).not.toBeInTheDocument();
  });

  it("calls the approve endpoint for the clicked request", async () => {
    mockHasPermission.mockReturnValue(true);
    mockInitialLoad([pendingRequest]);
    const user = userEvent.setup();

    render(<MaintenanceWorkspace mode="list" />);

    await waitFor(() => {
      expect(screen.getByText("MTN-2026-ABC123")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "اعتماد" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/maintenance-requests/req-1/approve",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("sends the typed rejection reason when rejecting", async () => {
    mockHasPermission.mockReturnValue(true);
    mockInitialLoad([pendingRequest]);
    const user = userEvent.setup();

    render(<MaintenanceWorkspace mode="list" />);

    await waitFor(() => {
      expect(screen.getByText("MTN-2026-ABC123")).toBeInTheDocument();
    });

    await user.type(
      screen.getByPlaceholderText("سبب الرفض (اختياري)"),
      "غير ضروري",
    );
    await user.click(screen.getByRole("button", { name: "رفض" }));

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
});
