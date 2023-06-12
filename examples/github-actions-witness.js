function hex(bytes) {
    return '0x' + Array.from(bytes, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}
function ghGet(url, token, raw) {
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
        throw new Error(`Bad status code: ${response.statusCode}, url: ${url}`);
    }
    if (raw) {
        return response.body;
    }
    return JSON.parse(response.body);
}

function parseUrl(pageUrl) {
    const match = pageUrl.match(/https:\/\/github.com\/([^\/]+)\/([^\/]+)\/actions\/runs\/(\d+)/);
    if (!match) {
        throw new Error("Invalid input url");
    }
    const [_all, owner, repo, runId] = match;
    const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const runUrl = `${repoUrl}/actions/runs/${runId}`;
    const jobsUrl = `${runUrl}/jobs`;
    const baseFileUrl = `${repoUrl}/contents`;
    return { runUrl, jobsUrl, baseFileUrl };
}

function witness(pageUrl, token) {
    const { runUrl, jobsUrl, baseFileUrl } = parseUrl(pageUrl);
    const { name, status, conclusion, path, head_sha } = ghGet(runUrl, token);
    if (status != "completed") {
        throw new Error("Action run not completed");
    }
    if (conclusion !== 'success') {
        throw new Error("Action run failed");
    }
    const workflowFile = ghGet(`${baseFileUrl}/${path}?ref=${head_sha}`, token, true);
    const workflowHash = hex(pink.hash("sha256", workflowFile));
    const jobs = ghGet(jobsUrl, token);
    const notes = jobs.jobs.flatMap(job => {
        const { name, check_run_url } = job;
        const PREFIX = 'witness.';
        return ghGet(`${check_run_url}/annotations`, token)
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
        runUrl: pageUrl,
        notes,
    });
}

witness(scriptArgs[0], scriptArgs[1]);