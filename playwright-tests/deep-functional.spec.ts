import { test, expect, Page } from '@playwright/test';

// --- Mocks Data ---

const mockAnimal = {
    id: 123,
    record: 'TEST-RECORD-001',
    name: 'Vaca Lola',
    gender: 'Hembra',
    birth_date: '2020-01-01',
    weight: 450,
    status: 'Sano',
    is_adult: true,
    has_images: false,
    notes: 'Notas de prueba para la vaca lola',
    breed_id: 1,
    father_id: 10,
    mother_id: 11
};

const mockTreatments = [
    {
        id: 101,
        animal_id: 123,
        treatment_date: '2024-01-15',
        description: 'Tratamiento Mock 1',
        dosis: '10ml',
        frequency: 'Cada 12h'
    },
    {
        id: 102,
        animal_id: 123,
        treatment_date: '2024-02-20',
        description: 'Tratamiento Mock 2 Para Borrar',
        dosis: '5ml',
        frequency: 'Unica'
    }
];

const mockUser = {
    id: 1,
    role: 'Administrador',
    fullname: 'Test Admin',
    identification: 'admin123'
};

const jwtToken = 'mock-jwt-token';

// --- Helper Functions ---

const mockApi = async (page: Page) => {
    await page.route('**/api/v1/auth/login', async route => {
        await route.fulfill({ status: 200, body: JSON.stringify({ access_token: jwtToken, user: mockUser }) });
    });

    await page.route('**/api/v1/auth/me', async route => {
        await route.fulfill({ status: 200, body: JSON.stringify({ user: mockUser }) });
    });

    // Mock Dashboard Analytics to avoid 404s
    await page.route('**/api/v1/analytics/**', async route => {
        await route.fulfill({ status: 200, body: JSON.stringify({ data: {} }) });
    });

    // Mock Animal List
    await page.route('**/api/v1/animals?**', async route => {
        await route.fulfill({
            status: 200,
            body: JSON.stringify({
                data: [mockAnimal],
                items: [mockAnimal],
                total: 1,
                page: 1,
                page_size: 10
            })
        });
    });

    // Mock Specific Animal Details (used by some calls)
    await page.route(`**/api/v1/animals/${mockAnimal.id}`, async route => {
        await route.fulfill({ status: 200, body: JSON.stringify(mockAnimal) });
    });

    // Mock Related Data - Empty by default, override in specific tests if needed
    await page.route('**/api/v1/genetic-improvements?**', async route => route.fulfill({ body: JSON.stringify({ data: [] }) }));
    await page.route('**/api/v1/animal-diseases?**', async route => route.fulfill({ body: JSON.stringify({ data: [] }) }));
    await page.route('**/api/v1/animal-fields?**', async route => route.fulfill({ body: JSON.stringify({ data: [] }) }));
    await page.route('**/api/v1/vaccinations?**', async route => route.fulfill({ body: JSON.stringify({ data: [] }) }));

    // Mock Treatments - Return our mock list
    await page.route('**/api/v1/treatments?**', async route => {
        // Check if it's the specific animal
        if (route.request().url().includes(`animal_id=${mockAnimal.id}`)) {
            await route.fulfill({ body: JSON.stringify({ data: mockTreatments }) });
        } else {
            await route.fulfill({ body: JSON.stringify({ data: [] }) });
        }
    });

    await page.route('**/api/v1/controls?**', async route => route.fulfill({ body: JSON.stringify({ data: [] }) }));

    // Mock Dependency Check for Deletion
    await page.route('**/api/v1/treatments/*/dependencies', async route => {
        await route.fulfill({ status: 200, body: JSON.stringify({ hasDependencies: false, dependencies: [] }) });
    });
};

const login = async (page: Page) => {
    await page.goto('/login');
    await page.fill('#documento', 'admin123'); // Assuming mock login matches
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
};

// --- Tests ---

test.describe('Animal Modal Deep Functional Test', () => {
    test.beforeEach(async ({ page }) => {
        await mockApi(page);
        await login(page);
    });

    test('Should open animal modal and display basic info', async ({ page }) => {
        // Navigate to animals list
        await page.goto('/admin/animals');

        // Switch to Table View explicitly to ensure row selection works usually
        const tableBtn = page.getByRole('button', { name: 'Tabla' });
        if (await tableBtn.isVisible()) {
            await tableBtn.click();
        }

        // Find the row with our mock animal and click it
        const animalRow = page.getByText(mockAnimal.record, { exact: false });
        await expect(animalRow).toBeVisible({ timeout: 10000 });
        await animalRow.first().click();

        // Verify Modal Opens using data-testid
        const modalTitle = page.getByTestId('animal-modal-title');
        await expect(modalTitle).toBeVisible({ timeout: 10000 });
        await expect(modalTitle).toHaveText(new RegExp(mockAnimal.record));

        // Verify Basic Info in Collapsible using data-testid
        const basicInfoSection = page.getByTestId('collapsible-section-basic-info');
        await expect(basicInfoSection).toBeVisible();

        // Expand if needed
        const header = basicInfoSection.locator('h3').first();
        // Check if content is visible (RelatedDataSection is collapsed by default)
        const isCollapsed = await basicInfoSection.locator('.overflow-hidden').first().evaluate(el => el.clientHeight === 0);
        if (isCollapsed) {
            await header.click();
        }
        await expect(page.getByText(mockAnimal.gender, { exact: false })).toBeVisible();
        await expect(page.getByText(mockAnimal.status, { exact: false })).toBeVisible();
    });

    test('Should display treatments and handle optimistic deletion', async ({ page }) => {
        await page.goto('/admin/animals');
        await page.locator(`text=${mockAnimal.record}`).click();

        // Locate Treatments Section using data-testid
        const treatmentSection = page.getByTestId('related-section-treatment');
        await expect(treatmentSection).toBeVisible();

        // Expand section if needed (RelatedDataSection is collapsed by default in AnimalModalContent)
        const header = treatmentSection.locator('.cursor-pointer').first();
        await header.click();

        // Ensure treatments are loaded
        await expect(page.locator('text=Tratamiento Mock 1')).toBeVisible();

        // Test Deletion of Treatment 102 using granular data-testid
        const specificDeleteBtn = page.getByTestId(`delete-item-btn-${mockTreatments[1].id}`);

        // Setup route to trap the delete request
        let deleteRequested = false;
        await page.route(`**/api/v1/treatments/${mockTreatments[1].id}`, async route => {
            if (route.request().method() === 'DELETE') {
                deleteRequested = true;
                await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
            } else {
                await route.continue();
            }
        });

        // Validar estado previo
        await expect(page.locator('text=Tratamiento Mock 2 Para Borrar')).toBeVisible();

        // Click Delete - First time (Expect Confirmation Toast/State)
        await specificDeleteBtn.click();

        // The toast text is "Haz clic de nuevo..."
        await expect(page.locator('text=Haz clic de nuevo')).toBeVisible();

        // Click Delete - Second time (Confirm)
        await specificDeleteBtn.click();

        // Verify Optimistic Update: Should disappear IMMEDIATELY from UI
        await expect(page.locator('text=Tratamiento Mock 2 Para Borrar')).toBeHidden();

        // Verify Backend Request was made
        expect(deleteRequested).toBe(true);

        // Verify Success Toast
        await expect(page.locator('text=Tratamiento eliminado correctamente')).toBeVisible();
    });

});
