import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("./api-client", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const mockHasPermission = vi.fn();
vi.mock("./auth-context", () => ({
  useAuth: () => ({
    hasPermission: mockHasPermission,
    logout: vi.fn(),
    status: "authenticated",
    user: { id: "u1", fullName: "أحمد", username: "ahmed" },
  }),
}));

import { apiFetch } from "./api-client";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("AppShell pending-approvals badges", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("shows a badge with the pending count next to approval-gated nav items", async () => {
    mockHasPermission.mockReturnValue(true);
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/notifications/pending-approvals") {
        return jsonResponse({
          transferRequests: 2,
          writeOffRequests: 1,
          maintenanceRequests: 5,
          total: 8,
        });
      }

      throw new Error(`unexpected path: ${path}`);
    });

    render(
      <AppShell active="dashboard" subtitle="s" title="t">
        <div />
      </AppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows no badge when there are no pending approvals", async () => {
    mockHasPermission.mockReturnValue(true);
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/notifications/pending-approvals") {
        return jsonResponse({
          transferRequests: 0,
          writeOffRequests: 0,
          maintenanceRequests: 0,
          total: 0,
        });
      }

      throw new Error(`unexpected path: ${path}`);
    });

    render(
      <AppShell active="dashboard" subtitle="s" title="t">
        <div />
      </AppShell>,
    );

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith("/notifications/pending-approvals");
    });
    expect(screen.getByText("اعتماد النقل")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
