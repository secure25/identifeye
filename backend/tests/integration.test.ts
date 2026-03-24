import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus } from "./helpers";

describe("API Integration Tests", () => {
  // Shared state for chaining tests
  let authToken: string;
  let userId: string;
  let applicationId: string;

  // Setup: Sign up test user
  test("Sign up test user", async () => {
    const { token, user } = await signUpTestUser();
    authToken = token;
    userId = user.id;
    expect(authToken).toBeDefined();
  });

  // Profile Endpoints
  test("POST /api/profile - Create user profile", async () => {
    const res = await authenticatedApi("/api/profile", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: "John",
        last_name: "Doe",
        date_of_birth: "1990-01-15",
        phone_primary: "+27123456789",
        email: "john@example.com",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBeDefined();
  });

  test("GET /api/profile - Get user profile", async () => {
    const res = await authenticatedApi("/api/profile", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.first_name).toBe("John");
  });

  test("PUT /api/profile/language - Update language preference", async () => {
    const res = await authenticatedApi("/api/profile/language", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "en" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.language).toBe("en");
  });

  test("GET /api/profile - Without authentication returns 401", async () => {
    const res = await api("/api/profile");
    await expectStatus(res, 401);
  });

  test("POST /api/profile - Missing required fields returns 400", async () => {
    const res = await authenticatedApi("/api/profile", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: "John" }),
    });
    await expectStatus(res, 400);
  });

  // Application Endpoints - CRUD Flow
  test("POST /api/applications - Create application", async () => {
    const res = await authenticatedApi("/api/applications", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_type: "id",
        application_subtype: "new",
        is_minor: false,
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    applicationId = data.id;
    expect(applicationId).toBeDefined();
    expect(data.user_id).toBeDefined();
    expect(data.status).toBeDefined();
  });

  test("GET /api/applications - List user applications", async () => {
    const res = await authenticatedApi("/api/applications", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.applications)).toBe(true);
    expect(data.applications.length).toBeGreaterThan(0);
  });

  test("GET /api/applications/{id} - Get specific application", async () => {
    const res = await authenticatedApi(`/api/applications/${applicationId}`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(applicationId);
  });

  test("PUT /api/applications/{id} - Update application details", async () => {
    const res = await authenticatedApi(`/api/applications/${applicationId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: "Jane",
        last_name: "Smith",
        date_of_birth: "1992-05-20",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(applicationId);
  });

  test("GET /api/applications/{id}/status - Get status updates", async () => {
    const res = await authenticatedApi(`/api/applications/${applicationId}/status`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.status_updates)).toBe(true);
  });

  test("POST /api/applications/{id}/payment - Process payment", async () => {
    const res = await authenticatedApi(`/api/applications/${applicationId}/payment`, authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_method: "absa" }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBeDefined();
  });

  test("POST /api/applications/{id}/submit - Submit application", async () => {
    const res = await authenticatedApi(`/api/applications/${applicationId}/submit`, authToken, {
      method: "POST",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(applicationId);
    expect(data.status).toBeDefined();
  });

  // Error cases
  test("GET /api/applications/{id} - Non-existent application returns 404", async () => {
    const res = await authenticatedApi("/api/applications/00000000-0000-0000-0000-000000000000", authToken);
    await expectStatus(res, 404);
  });

  test("POST /api/applications - Missing required fields returns 400", async () => {
    const res = await authenticatedApi("/api/applications", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_type: "id",
        // Missing application_subtype and is_minor
      }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/applications/{id}/payment - Missing required fields returns 400", async () => {
    const res = await authenticatedApi(`/api/applications/${applicationId}/payment`, authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("GET /api/applications - Without authentication returns 401", async () => {
    const res = await api("/api/applications");
    await expectStatus(res, 401);
  });

  test("POST /api/applications/{id}/submit - Non-existent application returns 404", async () => {
    const res = await authenticatedApi("/api/applications/00000000-0000-0000-0000-000000000000/submit", authToken, {
      method: "POST",
    });
    await expectStatus(res, 404);
  });

  test("PUT /api/profile/language - Without authentication returns 401", async () => {
    const res = await api("/api/profile/language", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "en" }),
    });
    await expectStatus(res, 401);
  });
});
