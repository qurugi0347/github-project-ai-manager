import { Injectable } from '@nestjs/common';
import { graphql } from '@octokit/graphql';
import { execSync } from 'child_process';

interface ProjectItem {
  id: string;
  content: {
    __typename: string;
    title?: string;
    body?: string;
    updatedAt?: string;
    labels?: { nodes: { name: string; color: string }[] };
    assignees?: { nodes: { login: string }[] };
    milestone?: { title: string } | null;
  } | null;
  fieldValues: {
    nodes: Array<{
      name?: string;
      text?: string;
      field?: { name: string };
    }>;
  };
}

interface ProjectItemsResponse {
  items: ProjectItem[];
  projectId: string;
  hasNextPage: boolean;
  endCursor: string | null;
}

@Injectable()
export class GitHubService {
  private getToken(): string {
    try {
      return execSync('gh auth token', { encoding: 'utf-8' }).trim();
    } catch {
      throw new Error('GitHub CLI 인증이 필요합니다. gh auth login을 실행하세요.');
    }
  }

  private getGraphqlClient() {
    const token = this.getToken();
    return graphql.defaults({
      headers: { authorization: `token ${token}` },
    });
  }

  async getProjectItems(
    owner: string,
    ownerType: string,
    projectNumber: number,
    cursor?: string,
  ): Promise<ProjectItemsResponse> {
    const gql = this.getGraphqlClient();

    const ownerField = ownerType === 'organization' ? 'organization' : 'user';

    const query = `
      query GetProjectItems($owner: String!, $number: Int!, $cursor: String) {
        ${ownerField}(login: $owner) {
          projectV2(number: $number) {
            id
            items(first: 100, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                content {
                  __typename
                  ... on DraftIssue {
                    title
                    body
                    updatedAt
                  }
                  ... on Issue {
                    title
                    body
                    updatedAt
                    labels(first: 20) {
                      nodes { name color }
                    }
                    assignees(first: 10) {
                      nodes { login }
                    }
                    milestone { title }
                  }
                  ... on PullRequest {
                    title
                    body
                    updatedAt
                    labels(first: 20) {
                      nodes { name color }
                    }
                    assignees(first: 10) {
                      nodes { login }
                    }
                    milestone { title }
                  }
                }
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field { ... on ProjectV2SingleSelectField { name } }
                    }
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field { ... on ProjectV2FieldCommon { name } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result: any = await gql(query, {
      owner,
      number: projectNumber,
      cursor: cursor || null,
    });

    const project = result[ownerField].projectV2;

    return {
      projectId: project.id,
      items: project.items.nodes,
      hasNextPage: project.items.pageInfo.hasNextPage,
      endCursor: project.items.pageInfo.endCursor,
    };
  }

  async getAllProjectItems(
    owner: string,
    ownerType: string,
    projectNumber: number,
  ): Promise<{ items: ProjectItem[]; projectId: string }> {
    const allItems: ProjectItem[] = [];
    let cursor: string | undefined;
    let projectId = '';

    do {
      const result = await this.getProjectItems(owner, ownerType, projectNumber, cursor);
      projectId = result.projectId;
      allItems.push(...result.items);
      cursor = result.hasNextPage ? (result.endCursor ?? undefined) : undefined;
    } while (cursor);

    return { items: allItems, projectId };
  }
}
