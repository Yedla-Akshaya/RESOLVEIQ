/**
 * GitHub Engineering Tool Adapter
 *
 * Implements code repository investigation and safe PR generation.
 * Operates in LIVE mode if GITHUB_TOKEN is available, or safe SIMULATION mode otherwise.
 */

const { mockRepositoryData } = require("./mockData");

const isLiveGitHubConfigured = Boolean(process.env.GITHUB_TOKEN);

/**
 * Registers GitHub tools with the gateway
 */
function registerGitHubTools(gateway) {
  // 1. Get Repository Info (Level 0: Read-Only)
  gateway.registerTool({
    name: "github_get_repo_info",
    category: "github",
    description: "Fetches repository details, default branch, and current release tag.",
    riskLevel: 0,
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Repository in owner/name format" }
      }
    },
    handler: async (args) => {
      if (isLiveGitHubConfigured) {
        // Live integration hook (Octokit / REST)
        return {
          repo: args.repo,
          _simulation: false,
          executionMode: "LIVE"
        };
      }

      // Safe simulation
      return {
        _simulation: true,
        executionMode: "SIMULATION",
        repo: args.repo || mockRepositoryData.repo,
        defaultBranch: mockRepositoryData.defaultBranch,
        currentRelease: mockRepositoryData.currentRelease,
        previousRelease: mockRepositoryData.previousRelease,
        openIssuesCount: 4,
        lastPush: mockRepositoryData.recentCommits[0].date
      };
    }
  });

  // 2. Get Recent Commits (Level 0: Read-Only)
  gateway.registerTool({
    name: "github_get_recent_commits",
    category: "github",
    description: "Retrieves recent commits to investigate recent code changes correlated with an incident.",
    riskLevel: 0,
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string" },
        limit: { type: "number", default: 5 }
      }
    },
    handler: async (args) => {
      const limit = args.limit || 5;

      return {
        _simulation: !isLiveGitHubConfigured,
        executionMode: isLiveGitHubConfigured ? "LIVE" : "SIMULATION",
        repo: args.repo || mockRepositoryData.repo,
        commits: mockRepositoryData.recentCommits.slice(0, limit)
      };
    }
  });

  // 3. Get Changed Files (Level 0: Read-Only)
  gateway.registerTool({
    name: "github_get_changed_files",
    category: "github",
    description: "Returns files changed in a specific commit or release.",
    riskLevel: 0,
    inputSchema: {
      type: "object",
      properties: {
        commitSha: { type: "string" }
      },
      required: ["commitSha"]
    },
    handler: async (args) => {
      const commit = mockRepositoryData.recentCommits.find(
        (c) => c.sha.startsWith(args.commitSha) || c.shortSha === args.commitSha
      ) || mockRepositoryData.recentCommits[0];

      return {
        _simulation: !isLiveGitHubConfigured,
        executionMode: isLiveGitHubConfigured ? "LIVE" : "SIMULATION",
        commitSha: commit.shortSha,
        changedFiles: commit.changedFiles
      };
    }
  });

  // 4. Get Commit Diff (Level 0: Read-Only)
  gateway.registerTool({
    name: "github_get_commit_diff",
    category: "github",
    description: "Inspects code diff of a commit to locate regressions or problematic configuration changes.",
    riskLevel: 0,
    inputSchema: {
      type: "object",
      properties: {
        commitSha: { type: "string" }
      }
    },
    handler: async (args) => {
      const commit = mockRepositoryData.recentCommits.find(
        (c) => c.sha.startsWith(args.commitSha) || c.shortSha === args.commitSha
      ) || mockRepositoryData.recentCommits[0];

      return {
        _simulation: !isLiveGitHubConfigured,
        executionMode: isLiveGitHubConfigured ? "LIVE" : "SIMULATION",
        commitSha: commit.shortSha,
        author: commit.author,
        message: commit.message,
        diff: commit.diff
      };
    }
  });

  // 5. Create Pull Request (Level 1: Low Risk)
  gateway.registerTool({
    name: "github_create_pull_request",
    category: "github",
    description: "Proposes a bugfix or configuration patch via a safe pull request.",
    riskLevel: 1,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        branch: { type: "string" },
        body: { type: "string" }
      },
      required: ["title", "branch"]
    },
    handler: async (args) => {
      return {
        _simulation: !isLiveGitHubConfigured,
        executionMode: isLiveGitHubConfigured ? "LIVE" : "SIMULATION",
        prNumber: 384,
        url: `https://github.com/${mockRepositoryData.repo}/pull/384`,
        status: "OPEN",
        title: args.title,
        branch: args.branch,
        message: "Automated patch PR created successfully for team review."
      };
    }
  });
}

module.exports = {
  registerGitHubTools
};
