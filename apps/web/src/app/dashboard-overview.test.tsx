import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardOverview } from "./dashboard-overview";

vi.mock("./api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "./api-client";

const summary = {
  assetsCount: 12,
  maintenanceRequestsCount: 3,
  movementRequestsCount: 0,
  attachmentsCount: 0,
  organizationUnitsCount: 5,
  assetCategoriesCount: 4,
  assetStatusesCount: 6,
};

const assets = [
  {
    id: "a1",
    internalNumber: "A-1",
    assetCategory: { name: "أجهزة", code: "DEV" },
    status: { name: "صالح" },
    owningOrganizationUnit: { name: "وحدة 1" },
  },
  {
    id: "a2",
    internalNumber: "A-2",
    assetCategory: { name: "سيارات", code: "VEH" },
    status: { name: "صالح" },
    owningOrganizationUnit: { name: "وحدة 1" },
  },
];

const maintenanceRequests = [
  {
    id: "m1",
    requestNumber: "MTN-1",
    description: "عطل",
    status: "OPEN",
    asset: { internalNumber: "A-1" },
    maintenanceType: { name: "طارئة" },
  },
  {
    id: "m2",
    requestNumber: "MTN-2",
    description: "دورية",
    status: "COMPLETED",
    asset: { internalNumber: "A-2" },
    maintenanceType: { name: "دورية" },
  },
];

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("DashboardOverview", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("renders the counts returned by the API and marks the connection as ready", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/dashboard") return jsonResponse(summary);
      if (path === "/assets") return jsonResponse(assets);
      if (path === "/maintenance-requests") return jsonResponse(maintenanceRequests);
      throw new Error(`unexpected path ${path}`);
    });

    render(<DashboardOverview />);

    expect(screen.getByText("جاري الاتصال بالخلفية")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("متصل بالخلفية")).toBeInTheDocument();
    });

    // إجمالي الموجودات من الملخص، وليس من عدد سجلات /assets المُرجعة بهذا الاختبار.
    expect(screen.getByText("12")).toBeInTheDocument();
    // طلب صيانة واحد فقط بحالة OPEN ضمن البيانات الوهمية.
    expect(screen.getAllByText("1 مفتوح").length).toBeGreaterThan(0);
  });

  it("shows an error state when any of the parallel requests fails", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/dashboard") return jsonResponse(summary);
      if (path === "/assets") return jsonResponse(null, false);
      if (path === "/maintenance-requests") return jsonResponse(maintenanceRequests);
      throw new Error(`unexpected path ${path}`);
    });

    render(<DashboardOverview />);

    await waitFor(() => {
      expect(screen.getByText("تعذر الاتصال بالخلفية")).toBeInTheDocument();
    });
  });
});
