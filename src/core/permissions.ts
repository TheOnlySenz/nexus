import { UserGuid, CommunityRoleGuid } from "../types/common";
import { Logger } from "./logger";

export enum PermissionLevel {
  MEMBER = 0,
  MODERATOR = 1,
  ADMIN = 2,
  OWNER = 3,
}

export interface PermissionContext {
  userId: UserGuid;
  communityId: string;
  memberRoles?: CommunityRoleGuid[];
  isOwner?: boolean;
}

const logger = new Logger("Permissions");

export class PermissionManager {
  private ownerId: UserGuid | null = null;
  private knownRoles: Map<string, { id: CommunityRoleGuid; name: string }> = new Map();

  setOwnerId(ownerId: UserGuid): void {
    this.ownerId = ownerId;
  }

  setKnownRoles(roles: ReadonlyMap<CommunityRoleGuid, { id?: CommunityRoleGuid; name: string }>): void {
    this.knownRoles.clear();
    for (const [id, r] of roles.entries()) {
      this.knownRoles.set(id, { id, name: r.name });
    }
  }

  addOrUpdateRole(id: CommunityRoleGuid, name: string): void {
    this.knownRoles.set(id, { id, name });
  }

  removeRole(id: CommunityRoleGuid): void {
    this.knownRoles.delete(id);
  }

  /**
   * Resolves the permission level for a given user in a community.
   */
  async resolvePermissionLevel(
    ctx: PermissionContext,
    isGlobalAdminOrMod?: boolean
  ): Promise<PermissionLevel> {
    // 1. Check Owner
    if (ctx.isOwner || (this.ownerId && ctx.userId === this.ownerId)) {
      return PermissionLevel.OWNER;
    }

    // 2. Check GlobalSettings moderator / admin group from manifest
    if (isGlobalAdminOrMod) {
      return PermissionLevel.ADMIN;
    }

    // 3. Inspect user's assigned role names
    if (ctx.memberRoles && ctx.memberRoles.length > 0) {
      let highest = PermissionLevel.MEMBER;

      for (const roleId of ctx.memberRoles) {
        const role = this.knownRoles.get(roleId);
        if (!role) continue;

        const roleName = role.name.toLowerCase();

        if (
          roleName === "owner" ||
          roleName.includes("superadmin") ||
          roleName.includes("head admin")
        ) {
          return PermissionLevel.ADMIN;
        }

        if (
          roleName === "admin" ||
          roleName.includes("administrator") ||
          roleName.includes("manager")
        ) {
          if (highest < PermissionLevel.ADMIN) highest = PermissionLevel.ADMIN;
        }

        if (
          roleName === "mod" ||
          roleName.includes("moderator") ||
          roleName.includes("staff")
        ) {
          if (highest < PermissionLevel.MODERATOR) highest = PermissionLevel.MODERATOR;
        }
      }

      return highest;
    }

    return PermissionLevel.MEMBER;
  }

  /**
   * Validates if a user satisfies the required permission level.
   */
  hasPermission(actual: PermissionLevel, required: PermissionLevel): boolean {
    return actual >= required;
  }
}
