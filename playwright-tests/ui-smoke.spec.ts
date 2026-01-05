import { test, expect, Page } from '@playwright/test';

type JsonValue = Record<string, unknown> | unknown[];

const adminUser = {
  id: 1,
  role: 'Administrador',
  fullname: 'Test User',
  identification: '12345678',
  status: true,
};
const jwtToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjo0MTAyNDQ0ODAwLCJpYXQiOjE3MDAwMDAwMDAsInJvbGUiOiJBZG1pbmlzdHJhZG9yIn0.sig';

const adminRoutes = [
  '/dashboard',
  '/admin/dashboard',
  '/admin/analytics/executive',
  '/admin/analytics/fields',
  '/admin/analytics/reports',
  '/admin/users',
  '/admin/animals',
  '/admin/fields',
  '/admin/species',
  '/admin/breeds',
  '/admin/control',
  '/admin/treatment_medications',
  '/admin/treatment_vaccines',
  '/admin/disease-animals',
  '/admin/animal-fields',
  '/admin/base_model',
  '/admin/route_administration',
  '/admin/vaccinations',
  '/admin/vaccines',
  '/admin/diseases',
  '/admin/medications',
  '/admin/food-types',
  '/admin/food-types/create',
  '/admin/genetic_improvements',
  '/admin/genetic-improvements',
  '/admin/controls',
  '/admin/treatments',
];

const instructorRoutes = [
  '/instructor/dashboard',
  '/instructor/analytics/executive',
  '/instructor/analytics/fields',
  '/instructor/analytics/reports',
  '/instructor/animals',
  '/instructor/fields',
  '/instructor/vaccines',
  '/instructor/vaccinations',
  '/instructor/medications',
  '/instructor/diseases',
  '/instructor/treatments',
  '/instructor/controls',
  '/instructor/animal-fields',
  '/instructor/disease-animals',
  '/instructor/genetic-improvements',
  '/instructor/species',
  '/instructor/breeds',
  '/instructor/food-types',
];

const apprenticeRoutes = [
  '/apprentice/dashboard',
  '/apprentice/analytics/executive',
  '/apprentice/analytics/fields',
  '/apprentice/analytics/reports',
  '/apprentice/animals',
  '/apprentice/fields',
  '/apprentice/vaccines',
  '/apprentice/vaccinations',
  '/apprentice/medications',
  '/apprentice/diseases',
  '/apprentice/treatments',
  '/apprentice/controls',
  '/apprentice/animal-fields',
  '/apprentice/disease-animals',
  '/apprentice/genetic-improvements',
  '/apprentice/species',
  '/apprentice/breeds',
  '/apprentice/food-types',
];

const jsonResponse = async (route: any, payload: JsonValue, status = 200) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
};

const mockApi = async (page: Page) => {
  const handler = async (route: any) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/auth/login')) {
      return jsonResponse(route, { access_token: jwtToken, user: adminUser });
    }
    if (url.includes('/auth/me')) {
      return jsonResponse(route, { user: adminUser });
    }
    if (url.includes('/auth/refresh')) {
      return jsonResponse(route, { access_token: jwtToken });
    }
    if (url.includes('/auth/logout')) {
      return jsonResponse(route, { ok: true });
    }
    if (url.includes('/analytics/alerts')) {
      return jsonResponse(route, { data: { alerts: [] } });
    }
    if (url.includes('/analytics/dashboard/complete')) {
      return jsonResponse(route, {
        data: {
          kpi_resumen: { cards: [] },
          distribucion_sexo: { machos: 0, hembras: 0 },
          distribucion_razas_top5: [],
          generated_at: new Date().toISOString(),
        },
      });
    }
    if (url.includes('/analytics/dashboard')) {
      return jsonResponse(route, { data: {} });
    }
    if (url.includes('/analytics/animals/statistics')) {
      return jsonResponse(route, {
        data: { by_status: {}, by_gender: {}, by_breed: [], age_distribution: [] },
      });
    }
    if (url.includes('/analytics/health/statistics')) {
      return jsonResponse(route, { data: { common_diseases: [] } });
    }
    if (url.includes('/analytics/production/statistics')) {
      return jsonResponse(route, {
        data: {
          weight_trends: [],
          total_fields: 0,
          animals_per_field: 0,
          monthly_costs: 0,
          field_utilization: 0,
          productivity_index: 0,
        },
      });
    }
    if (url.includes('/analytics/reports/custom')) {
      return jsonResponse(route, { data: { rows: [], summary: {} } });
    }

    if (method === 'HEAD') {
      return route.fulfill({ status: 200, body: '' });
    }

    if (method === 'GET') {
      return jsonResponse(route, {
        data: [],
        items: [],
        total: 0,
        page: 1,
        page_size: 10,
        pages: 0,
      });
    }

    return jsonResponse(route, { data: {}, ok: true });
  };

  await page.route('**/api/v1/**', handler);
  await page.route('**/api/analytics/**', handler);
};

const login = async (page: Page) => {
  await page.goto('/login');
  await page.fill('#documento', '12345678');
  await page.fill('#password', 'password1234');
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/dashboard/);
};

const assertRouteOk = async (page: Page, route: string) => {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/unauthorized|login/);
  await expect(page.locator('text=Acceso denegado')).toHaveCount(0);
  await expect(page.locator('text=Territorio')).toHaveCount(0);
};

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test('login flow works with mocked API', async ({ page }) => {
  await page.goto('/');
  await page.locator('a[href="/login"]').first().click();
  await page.waitForURL(/login/);
  await login(page);
  await expect(page).not.toHaveURL(/login/);
});

test('admin, instructor, and apprentice routes render without auth errors', async ({ page }) => {
  await login(page);

  for (const route of adminRoutes) {
    await assertRouteOk(page, route);
  }

  for (const route of instructorRoutes) {
    await assertRouteOk(page, route);
  }

  for (const route of apprenticeRoutes) {
    await assertRouteOk(page, route);
  }
});
