function hex(bytes) {
    return Array.from(bytes, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

class ActionRun {
    constructor(url) {
        const { owner, repo, runId } = parseActionUrl(url);
        this.owner = owner;
        this.repo = repo;
        this.runId = runId;
        this.repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
        this.url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`;
    }

    get baseFileUrl() {
        return `${this.repoUrl}/contents/`;
    }
    get baseFileUrl2() {
        return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/`;
    }
    get jobsUrl() {
        return `${this.url}/jobs`;
    }
}

function parseActionUrl(url) {
    const match = url.match(/https:\/\/github.com\/([^\/]+)\/([^\/]+)\/actions\/runs\/(\d+)/);
    if (!match) {
        throw new Error("Invalid input url");
    }
    return {
        owner: match[1],
        repo: match[2],
        runId: match[3],
    }
}

function githubApiGet(url, token, raw) {
    const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Phat-Witness',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (raw) {
        headers['Accept'] = 'application/vnd.github.raw';
    }
    const response = pink.httpRequest({
        url,
        headers,
        method: 'GET',
        returnTextBody: true,
    });
    if (response.statusCode !== 200) {
        throw new Error(`Bad status code: ${response.statusCode}`);
    }
    if (raw) {
        return response.body;
    }
    return JSON.parse(response.body);
}

function witnessActionRun(url, token) {
    const action = new ActionRun(url);
    const { name, status, conclusion, path, head_sha } = githubApiGet(action.url, token);
    if (status != "completed") {
        throw new Error("Action run not completed");
    }
    if (conclusion !== 'success') {
        throw new Error("Action run failed");
    }
    const workflowFile = githubApiGet(`${action.baseFileUrl}${path}?ref=${head_sha}`, token, true);
    const workflowHash = hex(pink.hash("sha256", workflowFile));
    const jobs = githubApiGet(action.jobsUrl, token);
    const notes = jobs.jobs.flatMap(job => {
        const { name, check_run_url } = job;
        const PREFIX = 'witness.';
        return githubApiGet(`${check_run_url}/annotations`, token)
            .filter(annotation => annotation.title.startsWith(PREFIX))
            .map(({ title, message }) => ({
                title: title.slice(PREFIX.length),
                value: message,
                jobName: name,
            }));
    });
    return JSON.stringify({
        workflowHash,
        name,
        path,
        gitCommit: head_sha,
        runUrl: url,
        notes,
    });
}

(function () {
    const actionUrl = scriptArgs[0];
    const ghToken = scriptArgs[1];
    return witnessActionRun(actionUrl, ghToken);
}())