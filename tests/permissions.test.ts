import { describe, it, expect } from "vitest";
import { PermissionManager, PermissionLevel } from "../src/core/permissions";
import { CommunityRoleGuid } from "../src/types/common";

describe("PermissionManager", () => {
  it("should recognize community owner as OWNER level", async () => {
    const pm = new PermissionManager();
    pm.setOwnerId("usr_owner_1");

    const level = await pm.resolvePermissionLevel({
      userId: "usr_owner_1",
      communityId: "comm_1",
    });

    expect(level).toBe(PermissionLevel.OWNER);
    expect(pm.hasPermission(level, PermissionLevel.ADMIN)).toBe(true);
    expect(pm.hasPermission(level, PermissionLevel.MODERATOR)).toBe(true);
  });

  it("should recognize globalSettings admin/moderator group flag", async () => {
    const pm = new PermissionManager();

    const level = await pm.resolvePermissionLevel(
      {
        userId: "usr_mod_1",
        communityId: "comm_1",
      },
      true // isGlobalAdminOrMod
    );

    expect(level).toBe(PermissionLevel.ADMIN);
  });

  it("should resolve role hierarchy based on role names", async () => {
    const pm = new PermissionManager();
    pm.addOrUpdateRole("role_admin" as CommunityRoleGuid, "Administrator");
    pm.addOrUpdateRole("role_mod" as CommunityRoleGuid, "Moderator");
    pm.addOrUpdateRole("role_member" as CommunityRoleGuid, "Community Member");

    // Regular member
    const memberLevel = await pm.resolvePermissionLevel({
      userId: "usr_regular",
      communityId: "comm_1",
      memberRoles: ["role_member" as CommunityRoleGuid],
    });
    expect(memberLevel).toBe(PermissionLevel.MEMBER);

    // Moderator
    const modLevel = await pm.resolvePermissionLevel({
      userId: "usr_mod",
      communityId: "comm_1",
      memberRoles: ["role_mod" as CommunityRoleGuid, "role_member" as CommunityRoleGuid],
    });
    expect(modLevel).toBe(PermissionLevel.MODERATOR);
    expect(pm.hasPermission(modLevel, PermissionLevel.MODERATOR)).toBe(true);
    expect(pm.hasPermission(modLevel, PermissionLevel.ADMIN)).toBe(false);

    // Admin
    const adminLevel = await pm.resolvePermissionLevel({
      userId: "usr_admin",
      communityId: "comm_1",
      memberRoles: ["role_admin" as CommunityRoleGuid],
    });
    expect(adminLevel).toBe(PermissionLevel.ADMIN);
    expect(pm.hasPermission(adminLevel, PermissionLevel.MODERATOR)).toBe(true);
    expect(pm.hasPermission(adminLevel, PermissionLevel.ADMIN)).toBe(true);
  });
});
