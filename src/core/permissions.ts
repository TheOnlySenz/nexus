import { rootServer } from "@rootsdk/server-bot";
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

export interface KnownRoleInfo {
  id: CommunityRoleGuid;
  name: string;
  communityPermission?: any;
  channelPermission?: any;
}

export class PermissionManager {
  private ownerId: UserGuid | null = null;
  private knownRoles: Map<string, KnownRoleInfo> = new Map();

  constructor() {
    const envOwner = process.env.OWNER_USER_ID || process.env.BOT_OWNER_ID;
    if (envOwner) {
      this.ownerId = envOwner.trim() as UserGuid;
      logger.info(`Owner ID configured from environment: ${this.ownerId}`);
    }
  }

  setOwnerId(ownerId: UserGuid): void {
    this.ownerId = ownerId;
    logger.info(`Community owner registered: ${ownerId}`);
  }

  getOwnerId(): UserGuid | null {
    return this.ownerId;
  }

  setKnownRoles(roles: ReadonlyMap<CommunityRoleGuid, { id?: CommunityRoleGuid; name: string; communityPermission?: any; channelPermission?: any }>): void {
    this.knownRoles.clear();
    for (const [id, r] of roles.entries()) {
      this.knownRoles.set(id, {
        id,
        name: r.name,
        communityPermission: r.communityPermission,
        channelPermission: r.channelPermission,
      });
    }
  }

  addOrUpdateRole(id: CommunityRoleGuid, name: string, communityPermission?: any, channelPermission?: any): void {
    this.knownRoles.set(id, { id, name, communityPermission, channelPermission });
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
    // 1. Direct Owner check
    if (ctx.isOwner || (this.ownerId && ctx.userId === this.ownerId)) {
      return PermissionLevel.OWNER;
    }

    // 2. Dynamic Owner check via Root API if ownerId is not yet resolved
    if (!this.ownerId) {
      try {
        if (rootServer?.community?.communities) {
          const community = await rootServer.community.communities.get();
          if (community?.ownerUserId) {
            this.ownerId = community.ownerUserId;
            logger.info(`Dynamically resolved community owner: ${this.ownerId}`);
            if (ctx.userId === this.ownerId) {
              return PermissionLevel.OWNER;
            }
          }
        }
      } catch (err) {
        // Fallback if communities.get is unavailable
      }
    }

    // 3. Check GlobalSettings moderator / admin group from manifest
    if (isGlobalAdminOrMod) {
      return PermissionLevel.ADMIN;
    }

    // 4. Inspect user's assigned roles (both permissions & names)
    if (ctx.memberRoles && ctx.memberRoles.length > 0) {
      let highest = PermissionLevel.MEMBER;

      for (const roleId of ctx.memberRoles) {
        let role = this.knownRoles.get(roleId);

        // Lazily fetch unknown role if needed
        if (!role && rootServer?.community?.communityRoles) {
          try {
            const fetched = await rootServer.community.communityRoles.get({ id: roleId });
            if (fetched) {
              role = {
                id: roleId,
                name: fetched.name,
                communityPermission: fetched.communityPermission,
                channelPermission: fetched.channelPermission,
              };
              this.knownRoles.set(roleId, role);
            }
          } catch {
            // Ignore fetch error
          }
        }

        if (!role) continue;

        const roleName = role.name.toLowerCase();

        // Check Root-native role permissions
        const cp = role.communityPermission;
        const chp = role.channelPermission;
        if (cp?.communityFullControl || cp?.communityManageCommunity || cp?.communityManageRoles) {
          if (highest < PermissionLevel.ADMIN) highest = PermissionLevel.ADMIN;
        } else if (cp?.communityKick || cp?.communityCreateBan || cp?.communityManageBans || chp?.channelFullControl || chp?.channelDeleteMessageOther) {
          if (highest < PermissionLevel.MODERATOR) highest = PermissionLevel.MODERATOR;
        }

        // Check role title patterns
        if (
          roleName === "owner" ||
          roleName.includes("co-owner") ||
          roleName.includes("founder") ||
          roleName.includes("creator")
        ) {
          return PermissionLevel.OWNER;
        }

        if (
          roleName === "admin" ||
          roleName.includes("administrator") ||
          roleName.includes("manager") ||
          roleName.includes("superadmin") ||
          roleName.includes("head admin") ||
          roleName.includes("lead") ||
          roleName.includes("chief")
        ) {
          if (highest < PermissionLevel.ADMIN) highest = PermissionLevel.ADMIN;
        }

        if (
          roleName === "mod" ||
          roleName.includes("moderator") ||
          roleName.includes("staff") ||
          roleName.includes("helper") ||
          roleName.includes("officer") ||
          roleName.includes("guard")
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
