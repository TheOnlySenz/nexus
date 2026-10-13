import {
  ChannelGuid,
  UserGuid,
  CommunityRoleGuid,
  MessageGuid,
  CommunityGuid,
} from "@rootsdk/server-bot";

export type {
  ChannelGuid,
  UserGuid,
  CommunityRoleGuid,
  MessageGuid,
  CommunityGuid,
};

export interface FormattedMention {
  text: string;
  uri: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
