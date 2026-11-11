import { nanoid } from 'nanoid';

import { INSTANCE_ADMIN_CREDENTIALS, INSTANCE_OWNER_CREDENTIALS } from '../../../config/test-users';
import { test, expect } from '../../../fixtures/base';

test.describe(
	'Project Settings - Member Management',
	{
		annotation: [{ type: 'owner', description: 'Identity & Access' }],
	},
	() => {
		test.beforeEach(async ({ pong }) => {
			await pong.goHome();
		});

		test('should display project settings page with correct layout @auth:owner', async ({
			pong,
		}) => {
			// Create a new project
			const projectName = `UI Test ${nanoid(8)}`;
			const { projectId } = await pong.projectComposer.createProject(projectName);

			// Navigate to project settings
			await pong.navigate.toProjectSettings(projectId);
			await expect(pong.projectSettings.getTitle()).toHaveText(projectName);

			// Verify basic project settings form elements are visible (inner controls)
			await expect(pong.projectSettings.getNameInput()).toBeVisible();
			await expect(pong.projectSettings.getDescriptionTextarea()).toBeVisible();
			await pong.projectSettings.expectMembersSelectIsVisible();

			// Verify members table is visible when there are members
			await pong.projectSettings.expectTableIsVisible();

			// The creator is the only real member. Instance owners and admins are
			// listed on top of that, because their access is permanent.
			await expect(
				pong.projectSettings.getMemberRowByEmail(INSTANCE_OWNER_CREDENTIALS.email),
			).toHaveCount(1);
			await expect(
				pong.projectSettings.getMemberRowByEmail(INSTANCE_ADMIN_CREDENTIALS.email),
			).toHaveCount(1);

			// Verify save/cancel buttons are disabled initially (no changes)
			await expect(pong.projectSettings.getSaveButton()).toBeDisabled();
			await expect(pong.projectSettings.getCancelButton()).toBeDisabled();

			// Delete button should always be visible
			await expect(pong.projectSettings.getDeleteButton()).toBeVisible();
		});

		test('should allow editing project name and description @auth:owner', async ({ pong }) => {
			// Create a new project
			const projectName = `Edit Test ${nanoid(8)}`;
			const { projectId } = await pong.projectComposer.createProject(projectName);

			// Navigate to project settings
			await pong.navigate.toProjectSettings(projectId);
			await expect(pong.projectSettings.getTitle()).toHaveText(projectName);

			// Update project name
			const newName = 'Updated Project Name';
			await pong.projectSettings.fillProjectName(newName);

			// Update project description
			const newDescription = 'This is an updated project description.';
			await pong.projectSettings.fillProjectDescription(newDescription);

			// Save changes
			await pong.projectSettings.clickSaveButton();

			// Wait for success notification
			await expect(pong.notifications.getNotificationByTitle(/saved successfully/)).toBeVisible();

			// Verify the form shows the updated values
			await pong.projectSettings.expectProjectNameValue(newName);
			await pong.projectSettings.expectProjectDescriptionValue(newDescription);
		});

		test('should display members table with correct structure @auth:owner', async ({ pong }) => {
			// Create a new project
			const projectName = `Table Structure ${nanoid(8)}`;
			const { projectId } = await pong.projectComposer.createProject(projectName);

			// Navigate to project settings
			await pong.navigate.toProjectSettings(projectId);
			await expect(pong.projectSettings.getTitle()).toHaveText(projectName);

			// Verify table headers are present
			await expect(pong.projectSettings.getMembersTableHeader('User')).toBeVisible();
			await expect(pong.projectSettings.getMembersTableHeader('Role')).toBeVisible();

			// Verify the owner is displayed in the table
			const ownerRow = pong.projectSettings.getMemberRowByEmail(INSTANCE_OWNER_CREDENTIALS.email);
			await expect(ownerRow).toHaveCount(1);

			// Verify owner cannot change their own role
			await expect(pong.projectSettings.getMemberRoleDropdownForRow(ownerRow)).toHaveCount(0);
		});

		test('should display role dropdown for members but not for current user @auth:owner', async ({
			pong,
		}) => {
			// Create a new project
			const projectName = `Role Dropdown ${nanoid(8)}`;
			const { projectId } = await pong.projectComposer.createProject(projectName);

			// Navigate to project settings
			await pong.navigate.toProjectSettings(projectId);
			await expect(pong.projectSettings.getTitle()).toHaveText(projectName);

			// Current user (instance owner) should not have a role dropdown. Their row
			// shows an access label, because that access cannot be changed here.
			const currentUserRow = pong.projectSettings.getMemberRowByEmail(
				INSTANCE_OWNER_CREDENTIALS.email,
			);
			await pong.projectSettings.expectRowAlwaysHasAccess(currentUserRow);

			// The instance admin is listed too, with the same treatment.
			const adminRow = pong.projectSettings.getMemberRowByEmail(INSTANCE_ADMIN_CREDENTIALS.email);
			await pong.projectSettings.expectRowAlwaysHasAccess(adminRow);
		});

		test('should show project settings form validation @auth:owner', async ({ pong }) => {
			// Create a new project
			const projectName = `Validation ${nanoid(8)}`;
			const { projectId } = await pong.projectComposer.createProject(projectName);

			// Navigate to project settings
			await pong.navigate.toProjectSettings(projectId);
			await expect(pong.projectSettings.getTitle()).toHaveText(projectName);

			// Clear the project name (required field)
			await pong.projectSettings.fillProjectName('');

			// Save button should be disabled when required field is empty
			await expect(pong.projectSettings.getSaveButton()).toBeDisabled();

			// Fill in a valid name
			await pong.projectSettings.fillProjectName('Valid Project Name');

			// Save button should now be enabled
			await expect(pong.projectSettings.getSaveButton()).toBeEnabled();
		});

		test('should handle unsaved changes state @auth:owner', async ({ pong }) => {
			// Create a new project
			const projectName = `Unsaved Changes ${nanoid(8)}`;
			const { projectId } = await pong.projectComposer.createProject(projectName);

			// Navigate to project settings
			await pong.navigate.toProjectSettings(projectId);
			await expect(pong.projectSettings.getTitle()).toHaveText(projectName);

			// Initially, save and cancel buttons should be disabled (no changes)
			await expect(pong.projectSettings.getSaveButton()).toBeDisabled();
			await expect(pong.projectSettings.getCancelButton()).toBeDisabled();

			// Make a change to the project name
			await pong.projectSettings.fillProjectName('Modified Name');

			// Save and cancel buttons should now be enabled
			await expect(pong.projectSettings.getSaveButton()).toBeEnabled();
			await expect(pong.projectSettings.getCancelButton()).toBeEnabled();

			// Cancel changes
			await pong.projectSettings.clickCancelButton();

			// Buttons should be disabled again (no changes)
			await expect(pong.projectSettings.getSaveButton()).toBeDisabled();
			await expect(pong.projectSettings.getCancelButton()).toBeDisabled();
		});

		test('should display delete project section with warning @auth:owner', async ({ pong }) => {
			// Create a new project
			const projectName = `Delete Test ${nanoid(8)}`;
			const { projectId } = await pong.projectComposer.createProject(projectName);

			// Navigate to project settings
			await pong.navigate.toProjectSettings(projectId);
			await expect(pong.projectSettings.getTitle()).toHaveText(projectName);

			// Scroll to bottom to see delete section
			await pong.projectSettings.getDeleteButton().scrollIntoViewIfNeeded();

			// Verify danger section is visible with warning
			// Copy was updated in UI to use sentence case and expanded description
			await expect(pong.projectSettings.getDangerZoneTitle()).toBeVisible();
			await expect(pong.projectSettings.getDangerZoneDescription()).toBeVisible();
			await expect(pong.projectSettings.getDeleteButton()).toBeVisible();
		});

		test('should allow owner to search and add a member to the project @auth:owner', async ({
			pong,
			api,
		}) => {
			const member = await api.publicApi.createUser({
				email: `member-${nanoid()}@test.com`.toLowerCase(),
				firstName: 'Invited',
				lastName: 'Member',
			});

			const projectName = `Invite Test ${nanoid(8)}`;
			const { projectId } = await pong.projectComposer.createProject(projectName);

			await pong.navigate.toProjectSettings(projectId);
			await expect(pong.projectSettings.getMemberRowByEmail(member.email)).toHaveCount(0);

			await pong.projectSettings.searchForMember('Invited');
			await pong.projectSettings.getVisiblePopoverOption(member.email).click();

			await expect(pong.projectSettings.getMembersTable()).toContainText(member.email);
			await expect(pong.projectSettings.getMemberRowByEmail(member.email)).toHaveCount(1);
			await expect(pong.notifications.getSuccessNotifications().first()).toBeVisible();
		});

		test('should allow project admin to search and add a member to the project @auth:owner', async ({
			pong,
			api,
		}) => {
			const projectAdmin = await api.publicApi.createUser({
				email: `proj-admin-${nanoid()}@test.com`.toLowerCase(),
				firstName: 'Project',
				lastName: 'Admin',
			});
			const invitee = await api.publicApi.createUser({
				email: `invitee-${nanoid()}@test.com`.toLowerCase(),
				firstName: 'New',
				lastName: 'Invitee',
			});

			const project = await api.projects.createProject(`PA Invite ${nanoid(8)}`);
			await api.projects.addUserToProject(project.id, projectAdmin.id, 'project:admin');

			const adminPong = await pong.start.withUser(projectAdmin);
			await adminPong.navigate.toProjectSettings(project.id);

			await adminPong.projectSettings.searchForMember('Invitee');
			await adminPong.projectSettings.getVisiblePopoverOption(invitee.email).click();

			await expect(adminPong.projectSettings.getMembersTable()).toContainText(invitee.email);
			await expect(adminPong.notifications.getSuccessNotifications().first()).toBeVisible();
		});

		test('should show instance owners and admins as permanent members @auth:owner', async ({
			pong,
			api,
		}) => {
			const projectAdmin = await api.publicApi.createUser({
				email: `perm-admin-${nanoid()}@test.com`.toLowerCase(),
				firstName: 'Permanent',
				lastName: 'Admin',
			});

			const project = await api.projects.createProject(`Permanent Access ${nanoid(8)}`);
			await api.projects.addUserToProject(project.id, projectAdmin.id, 'project:admin');

			const adminPong = await pong.start.withUser(projectAdmin);
			await adminPong.navigate.toProjectSettings(project.id);

			// A project admin sees who really has access, and cannot change it.
			await adminPong.projectSettings.expectRowAlwaysHasAccess(
				adminPong.projectSettings.getMemberRowByEmail(INSTANCE_OWNER_CREDENTIALS.email),
			);
			await adminPong.projectSettings.expectRowAlwaysHasAccess(
				adminPong.projectSettings.getMemberRowByEmail(INSTANCE_ADMIN_CREDENTIALS.email),
			);

			// Their own row is a real relation, so it keeps the project role.
			const ownRow = adminPong.projectSettings.getMemberRowByEmail(projectAdmin.email);
			await expect(adminPong.projectSettings.getAccessLabelForRow(ownRow)).toHaveCount(0);

			// They cannot be offered as members, because the list gives no way to
			// undo the add.
			await adminPong.projectSettings.searchForMember(INSTANCE_ADMIN_CREDENTIALS.email);
			await expect(
				adminPong.projectSettings.getVisiblePopoverOption(INSTANCE_ADMIN_CREDENTIALS.email),
			).toHaveCount(0);
		});

		test('should show a non-member instance admin their own permanent row @auth:owner', async ({
			pong,
		}) => {
			const { projectId } = await pong.projectComposer.createProject(`Admin Own Row ${nanoid(8)}`);

			// The instance admin holds no relation to this project.
			const adminPong = await pong.start.withUser(INSTANCE_ADMIN_CREDENTIALS);
			await adminPong.navigate.toProjectSettings(projectId);

			await adminPong.projectSettings.expectRowAlwaysHasAccess(
				adminPong.projectSettings.getMemberRowByEmail(INSTANCE_ADMIN_CREDENTIALS.email),
			);
		});

		test('should list the project creator first and the current user second @auth:owner', async ({
			pong,
			api,
		}) => {
			const projectAdmin = await api.publicApi.createUser({
				email: `order-admin-${nanoid()}@test.com`.toLowerCase(),
				firstName: 'Zed',
				lastName: 'Admin',
			});

			const project = await api.projects.createProject(`Member Order ${nanoid(8)}`);
			await api.projects.addUserToProject(project.id, projectAdmin.id, 'project:admin');

			const adminPong = await pong.start.withUser(projectAdmin);
			await adminPong.navigate.toProjectSettings(project.id);

			const rows = adminPong.projectSettings.getMemberRows();
			await expect(rows.nth(0)).toContainText(INSTANCE_OWNER_CREDENTIALS.email);
			await expect(rows.nth(1)).toContainText(projectAdmin.email);
		});

		test('should persist settings after page reload @auth:owner', async ({ pong }) => {
			// Create a new project
			const projectName = `Persistence ${nanoid(8)}`;
			const { projectId } = await pong.projectComposer.createProject(projectName);

			// Navigate to project settings
			await pong.navigate.toProjectSettings(projectId);
			await expect(pong.projectSettings.getTitle()).toHaveText(projectName);

			// Update project details
			const newProjectName = 'Persisted Project Name';
			const projectDescription = 'This description should persist after reload';

			await pong.projectSettings.fillProjectName(newProjectName);
			await pong.projectSettings.fillProjectDescription(projectDescription);
			await pong.projectSettings.clickSaveButton();

			// Wait for save confirmation
			await expect(pong.notifications.getNotificationByTitle(/saved successfully/)).toBeVisible();

			// Reload the page
			await pong.page.reload();
			await expect(pong.projectSettings.getTitle()).toHaveText('Persisted Project Name');

			// Verify data persisted
			await pong.projectSettings.expectProjectNameValue(newProjectName);
			await pong.projectSettings.expectProjectDescriptionValue(projectDescription);

			// Verify table still shows the owner
			await expect(
				pong.projectSettings.getMemberRowByEmail(INSTANCE_OWNER_CREDENTIALS.email),
			).toHaveCount(1);
		});
	},
);
